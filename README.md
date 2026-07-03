# EcoSim: Forest Dynamics

EcoSim is a spatial-stochastic simulation tool designed to explore the complex dynamics of forest land-cover change. It utilizes a **Kinetic Monte Carlo (KMC)** algorithm to model transitions between different ecological states, driven by environmental determinants like road proximity, terrain topography, and fire history.

## 🌲 The Simulation Engine: Kinetic Monte Carlo (KMC)

Unlike traditional time-step simulations (like Cellular Automata), KMC is an **event-driven algorithm**. It doesn't ask "what happens in the next minute?" but rather "which event happens next, and how long does it take?"

### How it works:
1. **Rate Calculation**: Every cell on the grid calculates the rates ($r_i$) for all possible transitions (e.g., a forest cell might have a rate for deforestation and a rate for fire).
2. **Total Rate**: The sum of all possible rates across the entire grid is calculated: $R_{total} = \sum r_i$.
3. **Time Advance**: Time advances by a stochastic increment $\Delta t = -\frac{\ln(u)}{R_{total}}$, where $u$ is a random number. This means periods of high activity result in small time steps, while stability results in large leaps forward.
4. **Event Selection**: A single event is chosen proportionally to its contribution to the total rate and executed.

## 🧬 Ecological States (Cell Types)

The simulation tracks four primary cell states:
- **Forest**: Primary, healthy forest cover. High conservation value.
- **Degraded**: Land that has lost its primary forest cover (e.g., through logging or agricultural clearing).
- **Restoring**: Secondary forest in the process of regeneration.
- **Burnt**: Areas recently affected by wildfire, characterized by high soil charcoal and lost biomass.

## 🗺️ Environmental Determinants (Factors)

Transition rates are not uniform; they are modified by the local environment:

- **Road Proximity**: Roads act as conduits for human activity. Cells closer to roads have exponentially higher deforestation rates, simulating the "fishbone" patterns often seen in frontier landscapes.
- **Topography (Slope)**: Steep slopes are less accessible for human clearing and agriculture, providing a "physical protection" that lowers deforestation rates.
- **Neighborhood Effect**: Deforestation is often contagious. If a cell's neighbors are already cleared, its own probability of being deforested increases, reflecting the expansion of agricultural frontiers.
- **Fire Threshold**: Wildfire risk is calculated based on forest density and neighborhood state. Drier, more fragmented edges are more susceptible to ignition.
- **Protection Buffers**: Designated "Protected Areas" (highlighted with emerald borders) apply a significant multiplier (e.g., 0.1x) to deforestation rates, representing the impact of conservation policy.

## 🛠️ Usage

Use the **Impact Factors** panel to manipulate the environmental variables in real-time:
- Increase **Road Proximity** to see how infrastructure drives fragmentation.
- Adjust **Neighborhood Sensitivity** to observe how "contagious" deforestation spreads through the landscape.
- Monitor the **Analysis Panel** to track Forest Cover percentage and Connectivity metrics over decades of simulated time.

## 🔬 Technical Context
This model serves as a "toy" representation of **Stochastic Land Use and Cover Change (LUCC)** modeling. It demonstrates how simple local rules can lead to complex emergent patterns of fragmentation and resilience in natural ecosystems.
