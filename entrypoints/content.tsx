import ReactDOM from "react-dom/client";
import "./style.css";
import { GhostText } from "@/components/GhostText";
import { setupInputListeners } from "@/services/inputListener.ts";

export default defineContentScript({
    matches: ["<all_urls>"],
    cssInjectionMode: "ui",
    async main(ctx) {

        const ui = await createShadowRootUi(ctx, {
            name: "english-output-learning-ui",
            position: "inline",

            anchor: "body",
            append: "last",
            onMount: (container) => {
                const root = ReactDOM.createRoot(container);
                root.render(<GhostText />);
                return root;
            },
            onRemove: (root) => {
                root?.unmount();
            },
        });

        ui.mount();

        // Setup listeners
        setupInputListeners();
    },
});
