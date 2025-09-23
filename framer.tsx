import React from "react"
import New from "./flat"
// Fix: Changed to a namespace import for 'framer' to resolve module export errors.
import * as Framer from "framer"

export default function Parallax(props) {
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
        <div style={containerStyle} {...rest}>
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
}

// Provide default props so the component looks good when first added
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
Framer.addPropertyControls(Parallax, {
    imageUrl: {
        type: Framer.ControlType.Image,
        title: "Image",
    },
    depthUrl: {
        type: Framer.ControlType.Image,
        title: "Depth Map",
    },
    depthScale: {
        type: Framer.ControlType.Number,
        title: "Depth Scale",
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 0.5,
        display: "slider",
    },
    layerBlending: {
        type: Framer.ControlType.Number,
        title: "Layer Blending",
        min: 0.01,
        max: 0.5,
        step: 0.01,
        defaultValue: 0.1,
        display: "slider",
    },
    backgroundCutoff: {
        type: Framer.ControlType.Number,
        title: "Far-plane Cutoff",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.25,
        display: "slider",
    },
    middlegroundCutoff: {
        type: Framer.ControlType.Number,
        title: "Mid-plane Cutoff",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.5,
        display: "slider",
    },
    isStatic: {
        type: Framer.ControlType.Boolean,
        title: "Static Mode",
        defaultValue: false,
    },
})
