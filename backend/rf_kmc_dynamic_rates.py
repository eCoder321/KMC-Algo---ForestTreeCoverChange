import copy
import math
import random
from statistics import mean
from data_types import KMCSimulationTracker, KMCDynamicRateConfig, CellType, LocalMultipliers
from rf_kmc_fixed_rates import generate_initial_grid
from datamanip import get_piecewise_constants_per_year
from shared import create_local_multipliers, REGROWTH_RATE

def run_kmc_simulation(simulation_tracker: KMCSimulationTracker, numSimulationRuns: int=1) -> tuple[dict[str, float], list[float]]:
    aggregated_runs: list[KMCSimulationTracker] = []
    for _ in range(numSimulationRuns):
      local_simulation_tracker = copy.deepcopy(simulation_tracker)
      rf_kmc_fixed_single_run(local_simulation_tracker)
      aggregated_runs.append(local_simulation_tracker)
    avg_stats = {
        "forestPctLeft": mean(x.forestPctLeft for x in aggregated_runs),
        "toForested": mean(x.toForested for x in aggregated_runs),
        "toAgriculture": mean(x.toAgriculture for x in aggregated_runs),
        "toBurned": mean(x.toBurned for x in aggregated_runs),
        "toOther": mean(x.toOther for x in aggregated_runs),
        "toLogged": mean(x.toLogged for x in aggregated_runs),
        "toSettlement": mean(x.toSettlement for x in aggregated_runs)
    }
    forestPctHistory = [x.forestPctLeft for x in aggregated_runs]
    return (avg_stats, forestPctHistory)


def rf_kmc_fixed_single_run(simulation_tracker: KMCSimulationTracker) -> KMCSimulationTracker:
  """
    - runs KMC till target year
  """
  grid = generate_initial_grid(size=simulation_tracker.gridSize)
  piecewise_event_rates = get_piecewise_constants_per_year()
  local_multipliers = create_local_multipliers()
  while simulation_tracker.currentYear <= simulation_tracker.targetYear: #<= bc we want the result at the end of the target year (in case there are multiple events in the target year)
    progressed = rf_kmc_fixed_single_event(piecewise_event_rates, local_multipliers, simulation_tracker, grid)
    if not progressed:
        break
  return simulation_tracker


def rf_kmc_fixed_single_event(config: KMCDynamicRateConfig, local_multipliers: LocalMultipliers, simulation_tracker: KMCSimulationTracker, grid: list[list[dict[str, int | CellType | str]]]) -> bool:
    """
    single run KMC - i.e. 1 event
    """
    size = simulation_tracker.gridSize
    cell_pct = (1/(size*size) * 100)
    events = []
    total_rate = 0.0
    if simulation_tracker.currentYear == 0: simulation_tracker.currentYear = simulation_tracker.startingYear
    current_year_index = int(simulation_tracker.currentTime)

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
                push_event(config[CellType.PERMANENT_AGRICULTURE.value][current_year_index] * (1 + local_multipliers.alpha * nA), CellType.PERMANENT_AGRICULTURE)
                push_event(config[CellType.BURNED.value][current_year_index] * (1 + local_multipliers.beta1 * nB), CellType.BURNED)
                push_event(config[CellType.LOGGED_DEGRADED.value][current_year_index] * (1 + local_multipliers.gamma * nL), CellType.LOGGED_DEGRADED)
                push_event(config[CellType.OTHER_TEMP_DISTURBANCE.value][current_year_index] * (1 + local_multipliers.delta * nO), CellType.OTHER_TEMP_DISTURBANCE)
                push_event(config[CellType.SETTLEMENT_INFRASTRUCTURE.value][current_year_index] * (1 + local_multipliers.eta * nS), CellType.SETTLEMENT_INFRASTRUCTURE)

            elif cell_type == CellType.BURNED:
                push_event(
                    REGROWTH_RATE
                    * (1 + local_multipliers.kappa1 * nF - local_multipliers.kappa2 * nA),
                    CellType.FORESTED,
                )
                push_event(config[CellType.PERMANENT_AGRICULTURE.value][current_year_index] * local_multipliers.multiplierBtoA, CellType.PERMANENT_AGRICULTURE)
                push_event(config[CellType.OTHER_TEMP_DISTURBANCE.value][current_year_index] * local_multipliers.multiplierBtoO, CellType.OTHER_TEMP_DISTURBANCE)

            elif cell_type == CellType.LOGGED_DEGRADED:
                push_event(
                    REGROWTH_RATE
                    * (1 + local_multipliers.kappa1 * nF - local_multipliers.kappa2 * nA),
                    CellType.FORESTED,
                )
                push_event(config[CellType.PERMANENT_AGRICULTURE.value][current_year_index] * local_multipliers.multiplierLtoA, CellType.PERMANENT_AGRICULTURE)
                push_event(config[CellType.BURNED.value][current_year_index] * local_multipliers.multiplierLtoB, CellType.BURNED)
                push_event(config[CellType.OTHER_TEMP_DISTURBANCE.value][current_year_index] * local_multipliers.multiplierLtoO, CellType.OTHER_TEMP_DISTURBANCE)

            elif cell_type == CellType.OTHER_TEMP_DISTURBANCE:
                push_event(
                    REGROWTH_RATE
                    * (1 + local_multipliers.kappa1 * nF - local_multipliers.kappa2 * nA),
                    CellType.FORESTED,
                )
                push_event(config[CellType.PERMANENT_AGRICULTURE.value][current_year_index] * local_multipliers.multiplierOtoA, CellType.PERMANENT_AGRICULTURE)
                push_event(config[CellType.BURNED.value][current_year_index] * local_multipliers.multiplierOtoB, CellType.BURNED)

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
