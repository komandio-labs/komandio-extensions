# Komandio Star Citizen Co-Pilot

The ultimate AI assistant for Star Citizen, transforming Komandio into a fully integrated "Jarvis" for the 'verse. This extension bridges the gap between voice immersion and the data-heavy reality of Star Citizen gameplay.

## 🚀 Key Features

### 1. The Omniscient Quartermaster (Market & Items)
**"Where is the Atlas Quantum Drive?"**
Never Alt-Tab to Erkul or UEX Corp again.
*   **Item Finder**: Instantly locates ships, components, weapons, and commodities.
*   **Price Check**: Provides real-time pricing and stock levels.
*   **Navigation**: Calculates jumps and routes to the nearest shop.
*   **Overlay**: Displays a sleek, holographic "Item Card" with stats and location on your HUD.

### 2. The Industrial Foreman (Mining & Salvage)
**"Scan analysis. 8000 mass, 15% Quantainium."**
Instant yield calculation for miners and salvagers.
*   **Yield Calculator**: Analyzes scan data to predict refined value (aUEC).
*   **Refinery Intelligence**: Recommends the best refinery deck based on current yield bonuses.
*   **Overlay**: Plots a value graph to help you decide: "Crack it" or "Move on".

### 3. The Combat Systems Officer (Ship Control)
**"Red Alert! Shields up!"**
Context-aware ship management that goes beyond simple macros.
*   **Semantic Control**: "Run Silent", "Chase Mode", "Defense Pattern Alpha".
*   **Smart Power Management**: Dynamically reroutes power triangles based on intent.
*   **System Prep**: Automatically spools Quantum, requests docking, or hails ATC based on context.

## 🛠️ Technical Architecture

*   **Service**: Maintains a local cache of the Universal Item Database (via UEX/cstone APIs) to ensure instant responses.
*   **Overlay**: A transparent, immersive HTML5 UI that renders data cards without blocking the game view.
*   **Input**: Direct integration with keyboard/mouse simulation for complex ship operations.
