import { solid } from "@fortawesome/fontawesome-svg-core/import.macro";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import useSound from "use-sound";

import "./MusicPlayer.css";
import urlJoin from "url-join";
import { getPublicUrl } from "../http-common";

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

export function MusicPlayer({ src }: { src: string }) {
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
        }
    });
    const [title, setTitle] = useState("");
    const [album, setAlbum] = useState("");
    const [artist, setArtist] = useState("");
    const [pictureFormat, setPictureFormat] = useState("");
    const [pictureBase64, setPictureBase64] = useState("");

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
        const interval = setInterval(() => {
            if (sound) {
                let seek = sound.seek([]);
                setSeconds(seek);
            }
        }, 1000);
        return () => {
            clearInterval(interval);
            stop();
        }
    }, [sound]);

    useEffect(() => {
        setTitle("");
        setAlbum("");
        setArtist("");
        setPictureFormat("");
        setPictureBase64("");
        jsmediatags.read(src, {
            onSuccess: function (tag: ID3Tag) {
                setTitle(tag.tags.title);
                setAlbum(tag.tags.album);
                setArtist(tag.tags.artist);
                setPictureFormat(tag.tags.picture.format);

                const pictureData = tag.tags.picture.data;
                let base64String = "";
                for (let i = 0; i < pictureData.length; i++) {
                    base64String += String.fromCharCode(pictureData[i]);
                }

                setPictureBase64(base64String);
            },
            onError: function (error: any) {
                console.error("Error reading tag: " + error);
            }
        });
    }, [src]);

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

    const cover = pictureBase64
        ? `data:${pictureFormat};base64,${window.btoa(pictureBase64)}`
        : urlJoin(getPublicUrl(), "logo512.png");

    return (
        <div id="MusicPlayer">
            <div id="song-bg-image" style={{
                backgroundImage: `url(${cover})`
            }} />
            <img
                className="song-cover"
                src={cover}
            />
            <div className="song-metadata">
                <h3 className="song-title">{title}</h3>
                <p className="song-sub-title">{album}</p>
                <p className="song-sub-title">{artist}</p>
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
                            sound.seek([value]);
                        }, 50);
                    }}
                />
                <div className="song-time">
                    <p>
                        {currTime.min.toLocaleString("en-GB", {
                            minimumIntegerDigits: 2,
                            useGrouping: false
                        })}:{currTime.sec.toLocaleString("en-GB", {
                            minimumIntegerDigits: 2,
                            useGrouping: false
                        })}
                    </p>
                    <p>
                        {time.min.toLocaleString("en-GB", {
                            minimumIntegerDigits: 2,
                            useGrouping: false
                        })}:{time.sec.toLocaleString("en-GB", {
                            minimumIntegerDigits: 2,
                            useGrouping: false
                        })}
                    </p>
                </div>
            </div>
            <div className="song-control-container">
                <div className="flex-grid-item volume-control-container">
                    <button className="song-volume-button" onClick={() => setMuted(!muted)}><FontAwesomeIcon icon={volumeLabel} /></button>
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
    );
}
