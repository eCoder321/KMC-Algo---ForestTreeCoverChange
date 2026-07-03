from rf_kmc_fixed_rates import run_kmc_simulation as run_kmc_simulation_fixed
from rf_kmc_dynamic_rates import run_kmc_simulation as run_kmc_simulation_dynamic
from data_types import KMCSimulationTracker


def main():
    core_simulation_tracker = KMCSimulationTracker(
    startingYear=2001,
    targetYear=2024
    )
    # call_fixed_rate_kmc(simulation_tracker=core_simulation_tracker)
    call_dynamic_rate_kmc(simulation_tracker=core_simulation_tracker)
    return True

def call_dynamic_rate_kmc(simulation_tracker: KMCSimulationTracker):
    print(f"\n--- DYNAMIC RATES ---")
    dynamic_single_run_results = run_kmc_simulation_dynamic(simulation_tracker, 1)
    print(f"single run result: {dynamic_single_run_results}")
    dynamic_multiple_run_results = run_kmc_simulation_dynamic(simulation_tracker, 20)
    print(f"\n multiple runs result: {dynamic_multiple_run_results}")
    return True

def call_fixed_rate_kmc(simulation_tracker: KMCSimulationTracker):
    print(f"\n--- FIXED RATES ---")
    fixed_single_run_results = run_kmc_simulation_fixed(simulation_tracker, 1)
    print(f"single run result: {fixed_single_run_results}")
    fixed_multiple_run_results = run_kmc_simulation_fixed(simulation_tracker, 200)
    print(f"\n multiple runs result: {fixed_multiple_run_results}")
    return True


if __name__ == "__main__":
    main()
