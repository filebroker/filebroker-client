import React, {ReactNode, useEffect, useRef, useState} from 'react';
import Marquee from 'react-fast-marquee';

const AutoMarquee = ({children}: { children: ReactNode }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [overflow, setOverflow] = useState(false);

    useEffect(() => {
        const currentRef = ref.current;
        if (!currentRef) return;
        const checkOverflow = () => {
            setOverflow(false);
            requestAnimationFrame(() => {
                const el = ref.current;
                if (el) {
                    setOverflow(el.scrollWidth > el.clientWidth);
                }
            });
        };
        checkOverflow();
        const resizeObserver = new ResizeObserver(checkOverflow);
        resizeObserver.observe(currentRef);
        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div ref={ref} style={{whiteSpace: 'nowrap', overflow: 'hidden'}}>
            {overflow ? (
                <Marquee>
                    {children}
                </Marquee>
            ) : (
                <span>{children}</span>
            )}
        </div>
    );
};

export default AutoMarquee;
