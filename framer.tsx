import React from "react"
import { New } from "./flat"
// Fix: Added a @ts-ignore to suppress module resolution errors for 'framer'. The 'framer' package is provided by the Framer environment and may not be available during static analysis in other contexts.
// @ts-ignore
import { addPropertyControls, ControlType } from "framer"

const Parallax = React.forwardRef<HTMLDivElement, any>((props, ref) => {
    const { 
        imageUrl, 
        depthUrl, 
        depthScale, 
        layerBlending, 
        backgroundCutoff, 
        middlegroundCutoff, 
        isStatic,
        ...rest 
    } = props;

    // A simple container to constrain the WebGL canvas within the Framer component frame
    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
    };

    return (
        <div ref={ref} style={containerStyle} {...rest}>
            <New
                imageUrl={imageUrl}
                depthUrl={depthUrl}
                depthScale={depthScale}
                layerBlending={layerBlending}
                backgroundCutoff={backgroundCutoff}
                middlegroundCutoff={middlegroundCutoff}
                isStatic={isStatic}
                showUI={false} // Always hide the built-in UI
            />
        </div>
    )
});

// Provide default props so the component looks good when first added
// Fix: Suppress TypeScript error for `defaultProps` on a `React.forwardRef` component.
// This is a known typing issue, and `defaultProps` is required by the Framer environment.
// @ts-ignore
Parallax.defaultProps = {
    width: 600,
    height: 400,
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
    depthUrl: "https://dummyimage.com/800x533/777/777.png", // A flat grey image is a safe default
    depthScale: 0.5,
    layerBlending: 0.1,
    backgroundCutoff: 0.25,
    middlegroundCutoff: 0.5,
    isStatic: false,
}

// Add controls to the Framer properties panel
// Fix: The `addPropertyControls` and `ControlType` are available from the 'framer' import above.
addPropertyControls(Parallax, {
    imageUrl: {
        type: ControlType.Image,
        title: "Image",
    },
    depthUrl: {
        type: ControlType.Image,
        title: "Depth Map",
    },
    depthScale: {
        type: ControlType.Number,
        title: "Depth Scale",
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 0.5,
        display: "slider",
    },
    layerBlending: {
        type: ControlType.Number,
        title: "Layer Blending",
        min: 0.01,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.1,
        display: "slider",
    },
    backgroundCutoff: {
        type: ControlType.Number,
        title: "Far-plane Cutoff",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.25,
        display: "slider",
    },
    middlegroundCutoff: {
        type: ControlType.Number,
        title: "Mid-plane Cutoff",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        display: "slider",
    },
    isStatic: {
        type: ControlType.Boolean,
        title: "Static Mode",
        defaultValue: false,
    },
})

export default Parallax;
