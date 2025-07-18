import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import useSound from "use-sound";

import "./MusicPlayer.css";
import urlJoin from "url-join";
import { getPublicUrl } from "../http-common";
import AutoMarquee from "./AutoMarquee";
import { useMediaQuery } from "@mui/material";

// @ts-ignore
const jsmediatags = window.jsmediatags;

interface ID3Tag {
    type: string;
    version: string;
    tags: {
        title: string,
        album: string,
        artist: string,
        genre: string,
        picture: {
            format: string,
            data: []
        },
    }
}

export function MusicPlayer({ src, metaSrc = src, metaTitle, metaAlbum, metaArtist, coverUrl }: {
    src: string,
    metaSrc?: string,
    metaTitle?: string | undefined,
    metaAlbum?: string | undefined,
    metaArtist?: string | undefined,
    coverUrl?: string | undefined
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(100);
    const [muted, setMuted] = useState(false);
    const [volumeLabel, setVolumeLabel] = useState(solid("volume-high"));
    const volumeSliderRef = useRef<HTMLInputElement | null>(null);
    const [play, { pause, stop, duration, sound }] = useSound(src, {
        volume: muted ? 0 : volume / 100,
        soundEnabled: !muted,
        onend: () => {
            setIsPlaying(false);
        },
        // enable HTML5 streaming and avoid web audio API memory leak issues (howler issue #914)
        html5: true
    });
    const [title, setTitle] = useState(metaTitle ?? "");
    const [album, setAlbum] = useState(metaAlbum ?? "");
    const [artist, setArtist] = useState(metaArtist ?? "");
    const [pictureBlobUrl, setPictureBlobUrl] = useState("");
    const pictureBlobUrlRef = useRef("");

    const [time, setTime] = useState({
        min: 0,
        sec: 0
    });
    const [currTime, setCurrTime] = useState({
        min: 0,
        sec: 0,
    });

    const [seconds, setSeconds] = useState("0");
    const timeSliderRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const min = Math.floor(+seconds / 60);
        const sec = Math.floor(+seconds % 60);
        setCurrTime({
            min,
            sec
        });
        if (timeSliderRef.current) {
            let target = timeSliderRef.current;
            const min = +target.min;
            const max = +target.max;
            const val = +target.value;

            target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%';
        }
    }, [seconds]);

    const setDuration = () => {
        if (duration) {
            const sec = duration / 1000;
            const min = Math.floor(sec / 60);
            const secRemain = Math.floor(sec % 60);
            setTime({
                min: min,
                sec: secRemain
            });
        }
    };

    useEffect(() => {
        setDuration();
    }, [isPlaying]);

    useEffect(() => {
        if (volume) {
            setMuted(false);
        }
    }, [volume]);

    useEffect(() => {
        if (muted) {
            setVolumeLabel(solid("volume-xmark"));
        } else if (volume < 50) {
            setVolumeLabel(solid("volume-low"));
        } else if (volume <= 0) {
            setVolumeLabel(solid("volume-off"));
        } else {
            setVolumeLabel(solid("volume-high"));
        }
        if (volumeSliderRef.current) {
            let target = volumeSliderRef.current;
            const min = +target.min;
            const max = +target.max;
            const val = +target.value;

            target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%';
        }
    }, [volume, muted]);

    useEffect(() => {
        setDuration();
        // if src changes, creating a new sound, this means a presigned URL was refreshed, restore position and play state
        if (+seconds > 0) {
            sound?.seek(+seconds);
        }
        if (isPlaying && !sound?.playing()) {
            play();
        }
        const interval = setInterval(() => {
            if (sound) {
                let seek = sound.seek();
                setSeconds(seek.toString());
            }
        }, 1000);
        return () => {
            clearInterval(interval);
            stop();
            if (sound) {
                sound.unload();
            }
        }
    }, [sound]);

    useEffect(() => {
        setTitle(metaTitle ?? "");
        setAlbum(metaAlbum ?? "");
        setArtist(metaArtist ?? "");
        setPictureBlobUrl("");

        jsmediatags.read(metaSrc, {
            onSuccess: function (tag: ID3Tag) {
                if (!title) {
                    setTitle(tag.tags.title);
                }
                if (!album) {
                    setAlbum(tag.tags.album);
                }
                if (!artist) {
                    setArtist(tag.tags.artist);
                }
                if (tag.tags.picture) {
                    const pictureFormat = tag.tags.picture.format;

                    const pictureData = tag.tags.picture.data;
                    let pictureByteString = "";
                    for (let i = 0; i < pictureData.length; i++) {
                        pictureByteString += String.fromCharCode(pictureData[i]);
                    }

                    const ab = new ArrayBuffer(pictureByteString.length);
                    const ia = new Uint8Array(ab);
                    for (var i = 0; i < pictureByteString.length; i++) {
                        ia[i] = pictureByteString.charCodeAt(i);
                    }

                    const blob = new Blob([ab], { type: pictureFormat });
                    const blobUrl = URL.createObjectURL(blob);
                    pictureBlobUrlRef.current = blobUrl;
                    setPictureBlobUrl(blobUrl);
                }
            },
            onError: function (error: any) {
                console.error("Error reading tag: " + error);
            }
        });

        return () => {
            if (pictureBlobUrlRef.current) {
                URL.revokeObjectURL(pictureBlobUrlRef.current);
            }
        }
    }, [src, metaSrc]);

    const onPlayPause = () => {
        if (isPlaying) {
            pause();
            setIsPlaying(false);
        } else {
            play();
            setIsPlaying(true);
        }
    };

    let scheduledScrub: NodeJS.Timeout | null = null;

    const cover = pictureBlobUrl
        ? pictureBlobUrl
        : coverUrl ? coverUrl : urlJoin(getPublicUrl(), "logo512.png");

    const isSongMetadataColumn = !useMediaQuery('(min-width: 600px)');

    return (
        <div id="MusicPlayer">
            <div id="song-bg-image" style={{
                backgroundImage: `url(${cover})`
            }} />
            <div className="music-player-container">
                <img
                    className="song-cover"
                    src={cover}
                />
                <div className="song-metadata">
                    <h3 className="song-title"><AutoMarquee>{title}</AutoMarquee></h3>
                    {/* If album + artist metadata shown as single column, apply AutoMarquee to whole column, else to each column individually */}
                    {isSongMetadataColumn
                        ? <AutoMarquee>
                            <div className="song-metadata-container">
                                <div><span className="song-sub-title">{album}</span></div>
                                <div><span className="song-sub-title">{artist}</span></div>
                            </div>
                        </AutoMarquee>
                        : <div className="song-metadata-container">
                            <div><AutoMarquee><span className="song-sub-title">{album}</span></AutoMarquee></div>
                            <div><AutoMarquee><span className="song-sub-title">{artist}</span></AutoMarquee></div>
                        </div>}
                </div>
                <div className="song-info-container">
                    <input
                        type="range"
                        min="0"
                        max={(duration ?? 0) / 1000}
                        value={seconds}
                        className="song-timeline"
                        ref={timeSliderRef}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSeconds(value);
                            if (scheduledScrub) {
                                clearTimeout(scheduledScrub);
                            }
                            scheduledScrub = setTimeout(async () => {
                                sound?.seek(+value);
                            }, 50);
                        }}
                    />
                    <div className="song-time">
                        <span className="song-time-stamp">
                            {currTime.min.toLocaleString("en-GB", {
                                minimumIntegerDigits: 2,
                                useGrouping: false
                            })}:{currTime.sec.toLocaleString("en-GB", {
                                minimumIntegerDigits: 2,
                                useGrouping: false
                            })}
                        </span>
                        <span className="song-time-stamp">
                            {time.min.toLocaleString("en-GB", {
                                minimumIntegerDigits: 2,
                                useGrouping: false
                            })}:{time.sec.toLocaleString("en-GB", {
                                minimumIntegerDigits: 2,
                                useGrouping: false
                            })}
                        </span>
                    </div>
                </div>
                <div className="song-control-container">
                    <div className="flex-grid-item volume-control-container">
                        <button className="song-volume-button" onClick={() => setMuted(!muted)}><FontAwesomeIcon className="player-icon" icon={volumeLabel} /></button>
                        <input
                            type="range"
                            className="volume-slider"
                            min="0"
                            max="100"
                            ref={volumeSliderRef}
                            value={volume}
                            onChange={(e) => setVolume(+e.target.value)}
                        />
                    </div>
                    <div className="flex-grid-item">
                        {!isPlaying ? (
                            <button className="song-play-button" disabled={!sound} onClick={onPlayPause}>
                                <FontAwesomeIcon icon={solid("circle-play")} size="3x" />
                            </button>
                        ) : (
                            <button className="song-play-button" disabled={!sound} onClick={onPlayPause}>
                                <FontAwesomeIcon icon={solid("circle-pause")} size="3x" />
                            </button>
                        )}
                    </div>
                    <div className="flex-grid-item"></div>
                </div>
            </div>
        </div>
    );
}
