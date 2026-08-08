import React from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-contrib-quality-menu";
import "videojs-contrib-quality-menu/dist/videojs-contrib-quality-menu.css";
import Hls from "hls.js";

import type Player from "video.js/dist/types/player";

type PlayerWithQualityMenu = Player & {
    qualityMenu(options?: {
        defaultResolution?: string;
        sdBitrateLimit?: number;
        useResolutionLabels?: boolean;
        resolutionLabelBitrates?: boolean;
    }): void;

    qualityLevels(): any;
};

export const VideoJS = (props: any) => {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const playerRef = React.useRef<Player | null>(null);
    const hlsRef = React.useRef<Hls | null>(null);
    const { options, onReady, onEnded } = props;

    const clearQualityLevels = (player: Player) => {
        const qualityLevels = (player as PlayerWithQualityMenu).qualityLevels();

        while (qualityLevels.length) {
            qualityLevels.removeQualityLevel(qualityLevels[0]);
        }
    };

    const destroyHls = (player: Player) => {
        hlsRef.current?.destroy();
        hlsRef.current = null;

        clearQualityLevels(player);

        (player.tech("trust me bro") as any).clearTracks(["audio", "text"]);
    };

    const loadSources = (player: Player, sources: any[]) => {
        const hlsSource = sources.find(
            (source) => source.type === "application/vnd.apple.mpegurl" || source.type === "application/x-mpegurl"
        );

        if (hlsSource && Hls.isSupported()) {
            destroyHls(player);

            const video = (player.tech() as any).el() as HTMLVideoElement;

            const hls = new Hls({
                renderTextTracksNatively: false,
            });
            hlsRef.current = hls;

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    console.error("fatal HLS.js error", data);
                } else {
                    console.error("HLS.js error", data);
                }
            });

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setupHlsQualityLevels(player, hls);
            });

            setupHlsAudioTracks(player, hls);
            setupHlsTextTracks(player, hls);

            hls.attachMedia(video);
            hls.loadSource(hlsSource.src);

            return;
        }

        // MP4, MOV, WebM, etc., plus native-HLS fallback where hls.js itself isn't supported.
        destroyHls(player);
        player.src(sources);
    };

    const useHlsJs =
        Hls.isSupported() &&
        options.sources.some(
            (source: any) => source.type === "application/vnd.apple.mpegurl" || source.type === "application/x-mpegurl"
        );

    const playerOptions = {
        ...options,
        html5: {
            ...options.html5,
            ...(useHlsJs && {
                nativeAudioTracks: false,
                nativeTextTracks: false,
            }),
        },
        sources: [],
    };

    React.useEffect(() => {
        // Make sure Video.js player is only initialized once
        if (!playerRef.current) {
            const videoElement = videoRef.current;

            if (!videoElement) return;

            const player = (playerRef.current = videojs(videoElement, playerOptions, () => {
                videojs.log("player is ready");
                onReady && onReady(player);
            }));

            (player as PlayerWithQualityMenu).qualityMenu({
                useResolutionLabels: true,
                resolutionLabelBitrates: false,
            });

            loadSources(player, options.sources);

            player.on("ended", () => {
                onEnded?.(player);
            });

            // You could update an existing player in the `else` block here
            // on prop change, for example:
        } else {
            const player = playerRef.current;

            const currentTime = player.currentTime();
            const paused = player.paused();
            loadSources(player, options.sources);
            player.one("canplay", () => {
                player.currentTime(currentTime);
                if (paused) {
                    player.pause();
                }
            });
        }
    }, [options, videoRef]);

    React.useEffect(() => {
        return () => {
            if (playerRef.current) {
                destroyHls(playerRef.current);
                playerRef.current.dispose();
            }
        };
    }, []);

    return (
        <div data-vjs-player>
            <video ref={videoRef} className="video-js vjs-big-play-centered" />
        </div>
    );
};

const setupHlsQualityLevels = (player: Player, hls: Hls) => {
    const qualityLevels = (player as PlayerWithQualityMenu).qualityLevels();
    const enabled = hls.levels.map(() => true);

    let updateQueued = false;

    const applyEnabledLevels = () => {
        if (updateQueued) {
            return;
        }

        updateQueued = true;

        queueMicrotask(() => {
            updateQueued = false;

            const enabledIndices = enabled.map((value, index) => (value ? index : -1)).filter((index) => index !== -1);

            if (enabledIndices.length === hls.levels.length) {
                // "Auto"
                hls.currentLevel = -1;
            } else if (enabledIndices.length) {
                // qualityMenu normally enables the selected resolution
                // and disables the others.
                hls.currentLevel = enabledIndices.reduce((best, index) =>
                    hls.levels[index].bitrate > hls.levels[best].bitrate ? index : best
                );
            }
        });
    };

    hls.levels.forEach((level, index) => {
        qualityLevels.addQualityLevel({
            id: String(index),
            width: level.width,
            height: level.height,
            bitrate: level.bitrate,
            frameRate: level.frameRate,

            enabled(value?: boolean) {
                if (value !== undefined) {
                    enabled[index] = value;
                    applyEnabledLevels();
                }

                return enabled[index];
            },
        });
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        qualityLevels.selectedIndex_ = data.level;

        qualityLevels.trigger({
            type: "change",
            selectedIndex: data.level,
        });
    });
};

const setupHlsAudioTracks = (player: Player, hls: Hls) => {
    const audioTracks = player.audioTracks();
    let videoJsTracks: InstanceType<typeof videojs.AudioTrack>[] = [];

    const onChange = () => {
        const selectedIndex = videoJsTracks.findIndex((track) => track.enabled);

        if (selectedIndex !== -1 && hls.audioTrack !== selectedIndex) {
            hls.audioTrack = selectedIndex;
        }
    };

    audioTracks.on("change", onChange);

    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
        for (const track of videoJsTracks) {
            audioTracks.removeTrack(track);
        }

        videoJsTracks = data.audioTracks.map(
            (track, index) =>
                new videojs.AudioTrack({
                    id: String(index),
                    kind: track.default ? "main" : "alternative",
                    label: track.name || track.lang || `Audio ${index + 1}`,
                    language: track.lang || "",
                    enabled: index === hls.audioTrack || (hls.audioTrack === -1 && track.default),
                })
        );

        for (const track of videoJsTracks) {
            audioTracks.addTrack(track);
        }
    });

    hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
        const track = videoJsTracks[data.id];

        if (track && !track.enabled) {
            track.enabled = true;
        }
    });

    hls.once(Hls.Events.DESTROYING, () => {
        audioTracks.off("change", onChange);
    });
};

const setupHlsTextTracks = (player: Player, hls: Hls) => {
    const textTracks = player.textTracks();

    let videoJsTracks: ReturnType<typeof player.addTextTrack>[] = [];
    let currentSubtitleTracks = hls.subtitleTracks;

    const onChange = () => {
        const selectedIndex = videoJsTracks.findIndex((track) => track?.mode === "showing");

        if (hls.subtitleTrack !== selectedIndex) {
            hls.subtitleTrack = selectedIndex;
        }
    };

    textTracks.on("change", onChange);

    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) => {
        for (const track of videoJsTracks) {
            if (track) {
                textTracks.removeTrack(track);
            }
        }

        currentSubtitleTracks = data.subtitleTracks;

        videoJsTracks = data.subtitleTracks.map((track, index) => {
            const videoJsTrack = player.addTextTrack(
                "subtitles",
                track.name || track.lang || `Subtitle ${index + 1}`,
                track.lang || ""
            );

            if (videoJsTrack) {
                videoJsTrack.mode = index === hls.subtitleTrack ? "showing" : "disabled";
            }

            return videoJsTrack;
        });
    });

    hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_event, data) => {
        videoJsTracks.forEach((track, index) => {
            if (track) {
                track.mode = index === data.id ? "showing" : "disabled";
            }
        });
    });

    hls.on(Hls.Events.CUES_PARSED, (_event, data) => {
        if (data.type !== "subtitles") {
            return;
        }

        const index =
            data.track === "default"
                ? currentSubtitleTracks.findIndex((track) => track.default)
                : Number(/^subtitles(\d+)$/.exec(data.track)?.[1] ?? -1);

        const videoJsTrack = videoJsTracks[index];

        if (!videoJsTrack) {
            return;
        }

        for (const cue of data.cues) {
            videoJsTrack.addCue(cue);
            if (!videoJsTrack.cues?.getCueById(cue.id)) {
                videoJsTrack.addCue(cue);
            }
        }
    });

    hls.once(Hls.Events.DESTROYING, () => {
        textTracks.off("change", onChange);
    });
};

export default VideoJS;
