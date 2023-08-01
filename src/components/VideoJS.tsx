import React from 'react';
import videojs, { VideoJsPlayer } from 'video.js';
import 'video.js/dist/video-js.css';

export const VideoJS = (props: any) => {
    const videoRef = React.useRef(null);
    const playerRef = React.useRef<VideoJsPlayer | null>(null);
    const { options, onReady } = props;

    React.useEffect(() => {

        // Make sure Video.js player is only initialized once
        if (!playerRef.current) {
            const videoElement = videoRef.current;

            if (!videoElement) return;

            const player = playerRef.current = videojs(videoElement, options, () => {
                videojs.log('player is ready');
                onReady && onReady(player);
            });

            // You could update an existing player in the `else` block here
            // on prop change, for example:
        } else {
            const player = playerRef.current;

            player.src(options.sources);
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.dispose();
            }
        }
    }, [options, videoRef]);

    return (
        <div data-vjs-player>
            <video ref={videoRef} className='video-js vjs-big-play-centered' />
        </div>
    );
}

export default VideoJS;
