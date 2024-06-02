import { Box, Collapse, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import { S3Object, S3ObjectMetadata } from "../Model";
import { AutoHideTableRow } from "./AutoHideTableRow";
import { filesize } from "filesize";
import urlJoin from "url-join";
import { getApiUrl } from "../http-common";
import { useState } from "react";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ReactJson from "@microlink/react-json-view";

export function FileMetadataDisplay({ s3_object, s3_object_metadata }: { s3_object: S3Object, s3_object_metadata: S3ObjectMetadata }) {
    let thumbnail;
    if (s3_object.thumbnail_object_key) {
        thumbnail = <Link href={urlJoin(getApiUrl(), "get-object", s3_object.thumbnail_object_key)} target="_blank">Link</Link>
    } else if (s3_object.thumbnail_locked_at) {
        thumbnail = "IN PROGRESS";
    } else if (s3_object.thumbnail_fail_count && s3_object.thumbnail_fail_count >= 3) {
        thumbnail = "FAILED";
    } else if (s3_object.thumbnail_disabled) {
        thumbnail = "DISABLED";
    }

    let hls;
    if (s3_object.hls_master_playlist) {
        hls = "YES";
    } else if (s3_object.hls_locked_at) {
        hls = "IN PROGRESS";
    } else if (s3_object.hls_fail_count && s3_object.hls_fail_count >= 3) {
        hls = "FAILED";
    } else if (s3_object.hls_disabled) {
        hls = "DISABLED";
    } else {
        hls = "NO";
    }

    let resolution;
    if (s3_object_metadata.width && s3_object_metadata.height) {
        resolution = `${s3_object_metadata.width}x${s3_object_metadata.height}`;
    }

    let trackNumber = s3_object_metadata.track_number?.toString();
    if (trackNumber && s3_object_metadata.track_count) {
        trackNumber += " of " + s3_object_metadata.track_count;
    }
    let discNumber = s3_object_metadata.disc_number?.toString();
    if (discNumber && s3_object_metadata.disc_count) {
        discNumber += " of " + s3_object_metadata.disc_count;
    }

    const [showRaw, setShowRaw] = useState(false);

    return (
        <div className="modal-form">
            <TableContainer component={Paper} sx={{ caretColor: "transparent" }}>
                <Table sx={{ minWidth: 300 }}>
                    <TableBody>
                        <AutoHideTableRow title="Key" value={s3_object.object_key} />
                        <AutoHideTableRow title="File Name" value={s3_object.filename} />
                        <AutoHideTableRow title="Mime Type" value={s3_object_metadata.mime_type || s3_object.mime_type} />
                        <AutoHideTableRow title="Size" value={filesize(s3_object.size_bytes, { base: 2 })} />
                        <AutoHideTableRow title="SHA256 Hash" value={s3_object.sha256_hash} />
                        <AutoHideTableRow title="Thumbnail" value={thumbnail} />
                        <AutoHideTableRow title="HLS" value={hls} />
                        <AutoHideTableRow title="Duration" value={s3_object_metadata.duration} />
                        <AutoHideTableRow title="Resolution" value={resolution} />
                        <AutoHideTableRow title="Date" value={s3_object_metadata.date} />
                        <AutoHideTableRow title="Title" value={s3_object_metadata.title} />
                        <AutoHideTableRow title="Artist" value={s3_object_metadata.artist} />
                        <AutoHideTableRow title="Album" value={s3_object_metadata.album} />
                        <AutoHideTableRow title="Album Artist" value={s3_object_metadata.album_artist} />
                        <AutoHideTableRow title="Composer" value={s3_object_metadata.composer} />
                        <AutoHideTableRow title="Genre" value={s3_object_metadata.genre} />
                        <AutoHideTableRow title="Track Number" value={trackNumber} />
                        <AutoHideTableRow title="Disc Number" value={discNumber} />
                        <AutoHideTableRow title="Bitrate" value={s3_object_metadata.bit_rate} />
                        <AutoHideTableRow title="Format" value={s3_object_metadata.format_name + " (" + s3_object_metadata.format_long_name + ")"} />
                        <AutoHideTableRow title="Video Codec" value={s3_object_metadata.video_codec_name + " (" + s3_object_metadata.video_codec_long_name + ")"} />
                        <AutoHideTableRow title="Video Framerate" value={s3_object_metadata.video_frame_rate} />
                        <AutoHideTableRow title="Video Bitrate Max" value={s3_object_metadata.video_bit_rate_max} />
                        <AutoHideTableRow title="Audio Codec" value={s3_object_metadata.audio_codec_name + " (" + s3_object_metadata.audio_codec_long_name + ")"} />
                        <AutoHideTableRow title="Audio Bitrate Max" value={s3_object_metadata.audio_bit_rate_max} />
                        <AutoHideTableRow title="Audio Sample Rate" value={s3_object_metadata.audio_sample_rate} />
                        {s3_object_metadata && <>
                            <TableRow>
                                <TableCell>
                                    <IconButton
                                        aria-label="expand row"
                                        size="small"
                                        onClick={() => setShowRaw(!showRaw)}
                                    >
                                        {showRaw ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                    </IconButton>
                                </TableCell>
                                <TableCell>Raw</TableCell>
                            </TableRow>
                            <TableRow sx={{ "border": "none" }}>
                                <TableCell sx={{ "border": "none" }}>
                                    <Collapse in={showRaw} timeout="auto" unmountOnExit>
                                        <Box sx={{ margin: 1 }}>
                                            <ReactJson src={s3_object_metadata.raw} theme={"ocean"} />
                                        </Box>
                                    </Collapse>
                                </TableCell>
                            </TableRow>
                        </>}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
}
