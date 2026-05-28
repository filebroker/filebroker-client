import { SvgIcon, SvgIconProps } from "@mui/material";
import React from "react";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type FontAwesomeSvgIconProps = SvgIconProps & {
    icon: IconDefinition;
};

export const FontAwesomeSvgIcon = React.forwardRef<
    SVGSVGElement,
    FontAwesomeSvgIconProps
>((props, ref) => {
    const { icon, ...rest } = props;

    const {
        icon: [width, height, , , svgPathData],
    } = icon;

    return (
        <SvgIcon ref={ref} viewBox={`0 0 ${width} ${height}`} {...rest}>
            {typeof svgPathData === "string" ? (
                <path d={svgPathData} />
            ) : (
                svgPathData.map((d, i) => (
                    <path
                        key={i}
                        style={{ opacity: i === 0 ? 0.4 : 1 }}
                        d={d}
                    />
                ))
            )}
        </SvgIcon>
    );
});
