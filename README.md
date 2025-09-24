# Dynamic Parallax Experience

**Live Demo:** [**https://interactive-evidence-009777.framer.app/**](https://interactive-evidence-009777.framer.app/)

---

### TL;DR (ELI5)

This is a magic tool that turns flat photos into cool, 3D scenes. When you give it a normal picture and a special black-and-white "depth" picture, it creates an illusion of depth. The scene then moves as you move your mouse, making it feel like you're looking through a window into a 3D world.

---

### Context Map (What is this?)

This project is an immersive web application that constructs a dynamic 3D parallax scene from two 2D images: a standard color image and a corresponding depth map. The result is a visually engaging experience where the scene's perspective shifts in response to cursor movement or touch gestures, creating a convincing illusion of three-dimensionality.

**Core Features:**

*   **Hybrid Rendering Engine:** It uses an advanced technique that combines a displaced 3D mesh for solid objects with volumetric layers for soft, feathered edges. This avoids the flat "cardboard cutout" look common in simpler parallax effects.
*   **Procedural Infill:** The engine intelligently generates background texture for areas that become visible during movement (occlusion), ensuring a seamless and realistic effect without needing external AI services.
*   **Physics-Based Animation:** Interactions are powered by Framer Motion, providing fluid, natural-feeling animations for both the 3D scene and the user interface.
*   **Real-time Controls:** A side panel allows users to intuitively adjust all parameters of the effect—such as depth intensity, layer separation, and edge blending—and see the results instantly.
*   **File Handling:** Users can upload their own image and depth map pairs to create custom scenes.
*   **Preset System:** The exact settings for a scene can be exported to a JSON file and imported later, allowing for easy sharing and reuse of favorite configurations.

---

### Directory Tree Map (How is it organized?)

The project recently underwent a significant refactor (detailed in `plan.txt`) to consolidate the application logic, making it more streamlined and portable.

*   **Core Files (Active):**
    *   `README.md`: This file.
    *   `index.html`: The main HTML page. It sets up the import map for all dependencies and loads the main script.
    *   `index.tsx`: The primary entry point for the React application. It finds the 'root' element in the HTML and renders the main component.
    *   `flat.tsx`: **The entire application logic.** This single, "flattened" file contains the main app component (`<New />`), all sub-components (Uploader, ParallaxScene, etc.), inline CSS-in-JS styling, and all the Three.js/`@react-three/fiber` 3D rendering logic.
    *   `framer.tsx`: A special version of the application component adapted for use within the [Framer](httpshttps://framer.com) design and prototyping tool. It uses an imperative Three.js setup for performance and compatibility within that environment.

*   **Supporting & Legacy Files:**
    *   `plan.txt`: A developer document outlining the technical plan for the major refactor that resulted in the current `flat.tsx` structure.
    *   `App.tsx`, `style.tsx`, `components/`, `hooks/`: These files and directories contain the previous, multi-file version of the application. While the logic inside them is foundational to the current app, they are **no longer directly imported or used** in the live build. They are kept for historical and referential purposes.
