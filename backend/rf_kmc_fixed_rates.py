import copy
import math
import random
from statistics import mean
from data_types import KMCSimulationTracker, KMCFixedRateConfig, CellType


INITIAL_CONFIG = {
    "gridSize": 40,
    "rateFtoA": 0.001360306,
    "rateFtoB": 0.0000707808,
    "rateFtoL": 0.0000304576,
    "rateFtoO": 0.000110815,
    "rateFtoS": 0.000000844248,
    "regrowthBaseRate": 0.0000685,
    "alpha": 0.25,
    "beta1": 0.35,
    "gamma": 0.10,
    "delta": 0.08,
    "eta": 0.15,
    "kappa1": 0.15,
    "kappa2": 0.15,
    "rateBtoA": 0,
    "rateBtoO": 0,
    "rateLtoA": 0,
    "rateLtoB": 0,
    "rateLtoO": 0,
    "rateOtoA": 0,
    "rateOtoB": 0
}

# using these heuristics to model the other possible transitions we do not have data for
kmc_fixed_config = KMCFixedRateConfig(**INITIAL_CONFIG)
kmc_fixed_config.rateBtoO = kmc_fixed_config.rateFtoO * 0.2
kmc_fixed_config.rateBtoA = kmc_fixed_config.rateFtoA * 0.5
kmc_fixed_config.rateLtoA = kmc_fixed_config.rateFtoA * 0.8
kmc_fixed_config.rateLtoB = kmc_fixed_config.rateFtoB * 1.5
kmc_fixed_config.rateLtoO = kmc_fixed_config.rateFtoO * 0.3
kmc_fixed_config.rateOtoA = kmc_fixed_config.rateFtoA * 0.4
kmc_fixed_config.rateOtoB = kmc_fixed_config.rateFtoB


def run_kmc_simulation(simulation_tracker: KMCSimulationTracker, numSimulationRuns: int=1) -> dict[str, float]:
    aggregated_runs: list[KMCSimulationTracker] = []
    for _ in range(numSimulationRuns):
      local_simulation_tracker = copy.deepcopy(simulation_tracker)
      aggregated_runs.append(rf_kmc_fixed_single_run(local_simulation_tracker))
    avg_stats = {
        "forestPctLeft": mean(x.forestPctLeft for x in aggregated_runs),
        "toForested": mean(x.toForested for x in aggregated_runs),
        "toAgriculture": mean(x.toAgriculture for x in aggregated_runs),
        "toBurned": mean(x.toBurned for x in aggregated_runs),
        "toOther": mean(x.toOther for x in aggregated_runs),
        "toLogged": mean(x.toLogged for x in aggregated_runs),
        "toSettlement": mean(x.toSettlement for x in aggregated_runs)
    }
    return avg_stats


def rf_kmc_fixed_single_run(simulation_tracker: KMCSimulationTracker) -> KMCSimulationTracker:
  """
    - runs KMC till target year
  """
  grid = generate_initial_grid(size=kmc_fixed_config.gridSize)
  while simulation_tracker.currentYear <= simulation_tracker.targetYear: #<= bc we want the result at the end of the target year (in case )
    progressed = rf_kmc_fixed_single_event(kmc_fixed_config, simulation_tracker, grid)
    if not progressed:
        break
  return simulation_tracker


def rf_kmc_fixed_single_event(config: KMCFixedRateConfig, simulation_tracker: KMCSimulationTracker, grid) -> bool:
    """
    single run KMC - i.e. 1 event
    """
    size = config.gridSize
    cell_pct = (1/(size*size) * 100)
    events = []
    total_rate = 0.0

    for y in range(size):
        for x in range(size):
            cell = grid[y][x]

            def push_event(rate, next_type):
                nonlocal total_rate
                if rate > 0:
                    events.append({"x": x, "y": y, "rate": rate, "next_type": next_type})
                    total_rate += rate

            nA = nB = nL = nO = nS = nF = 0
            neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]]

            for dx, dy in neighbors:
                nx = x + dx
                ny = y + dy
                if (0 <= nx < size and 0 <= ny < size):
                    neighbor_type = grid[ny][nx]["type"]
                    match neighbor_type:
                        case CellType.PERMANENT_AGRICULTURE:
                            nA += 1
                        case CellType.BURNED:
                            nB += 1
                        case CellType.LOGGED_DEGRADED:
                            nL += 1
                        case CellType.OTHER_TEMP_DISTURBANCE:
                            nO += 1
                        case CellType.SETTLEMENT_INFRASTRUCTURE:
                            nS += 1
                        case CellType.FORESTED:
                            nF += 1

            cell_type = cell["type"]
            if cell_type == CellType.FORESTED:
                push_event(config.rateFtoA * (1 + config.alpha * nA), CellType.PERMANENT_AGRICULTURE)
                push_event(config.rateFtoB * (1 + config.beta1 * nB), CellType.BURNED)
                push_event(config.rateFtoL * (1 + config.gamma * nL), CellType.LOGGED_DEGRADED)
                push_event(config.rateFtoO * (1 + config.delta * nO), CellType.OTHER_TEMP_DISTURBANCE)
                push_event(config.rateFtoS * (1 + config.eta * nS), CellType.SETTLEMENT_INFRASTRUCTURE)

            elif cell_type == CellType.BURNED:
                push_event(
                    config.regrowthBaseRate
                    * (1 + config.kappa1 * nF - config.kappa2 * nA),
                    CellType.FORESTED,
                )
                push_event(config.rateBtoA, CellType.PERMANENT_AGRICULTURE)
                push_event(config.rateBtoO, CellType.OTHER_TEMP_DISTURBANCE)

            elif cell_type == CellType.LOGGED_DEGRADED:
                push_event(
                    config.regrowthBaseRate
                    * (1 + config.kappa1 * nF - config.kappa2 * nA),
                    CellType.FORESTED,
                )
                push_event(config.rateLtoA, CellType.PERMANENT_AGRICULTURE)
                push_event(config.rateLtoB, CellType.BURNED)
                push_event(config.rateLtoO, CellType.OTHER_TEMP_DISTURBANCE)

            elif cell_type == CellType.OTHER_TEMP_DISTURBANCE:
                push_event(
                    config.regrowthBaseRate
                    * (1 + config.kappa1 * nF - config.kappa2 * nA),
                    CellType.FORESTED,
                )
                push_event(config.rateOtoA, CellType.PERMANENT_AGRICULTURE)
                push_event(config.rateOtoB, CellType.BURNED)

    if total_rate == 0.0:
        return False

    dt = math.log(1 / (1 - random.random())) / total_rate
    random_event_rate = random.random() * total_rate
    cumulative_rate = 0.0
    selected_event = None

    for event in events:
        cumulative_rate += event["rate"]
        if random_event_rate <= cumulative_rate:
            selected_event = event
            break

    if selected_event is not None:
        event_x = selected_event["x"]
        event_y = selected_event["y"]
        event_type = selected_event["next_type"]
        grid[event_y][event_x]["type"] = event_type

        if event_type == CellType.PERMANENT_AGRICULTURE:
            simulation_tracker.toAgriculture += 1
        elif event_type == CellType.BURNED:
            simulation_tracker.toBurned += 1
        elif event_type == CellType.LOGGED_DEGRADED:
            simulation_tracker.toLogged += 1
        elif event_type == CellType.OTHER_TEMP_DISTURBANCE:
            simulation_tracker.toOther += 1
        elif event_type == CellType.SETTLEMENT_INFRASTRUCTURE:
            simulation_tracker.toSettlement += 1
        elif event_type == CellType.FORESTED:
            simulation_tracker.toForested += 1

    # update other necessary values
    simulation_tracker.currentTime = simulation_tracker.currentTime + dt
    if event_type == CellType.FORESTED: simulation_tracker.forestPctLeft += cell_pct
    else: simulation_tracker.forestPctLeft -= cell_pct
    simulation_tracker.currentYear = int(simulation_tracker.startingYear + simulation_tracker.currentTime)

    return True


def generate_initial_grid(size) -> list[list[dict[str, int | CellType | str]]]:
    grid = []
    for y in range(size):
        row = []
        for x in range(size):
            row.append({
                "id": f"{x}-{y}",
                "x": x,
                "y": y,
                "type": CellType.FORESTED,
            })
        grid.append(row)
    return grid
