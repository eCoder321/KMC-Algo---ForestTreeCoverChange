import pandas as pd
from rf_kmc_fixed_rates import run_kmc_simulation as run_kmc_simulation_fixed
from rf_kmc_piecewise_constants_replay import run_kmc_simulation as run_kmc_simulation_piecewise
from rf_kmc_dynamic_rates import run_kmc_simulation as run_kmc_simulation_dynamic
from data_types import KMCSimulationTracker
from shared import calculate_accuracy


def main():
    core_simulation_tracker = KMCSimulationTracker(
    startingYear=2001,
    targetYear=2024,
    trainingMaxYear=2012
    )
    # call_fixed_rate_kmc(simulation_tracker=core_simulation_tracker)
    # call_piecewise_rate_kmc(simulation_tracker=core_simulation_tracker)
    # call_dynamic_rate_kmc(simulation_tracker=core_simulation_tracker)
    training_year_results = []
    for i in range(13):
        forestPctleft = run_kmc_simulation_dynamic(core_simulation_tracker, 200)[0]["forestPctLeft"]
        accuracy = calculate_accuracy(forestPctleft)
        training_year_results.append(
            {
                "training_year": core_simulation_tracker.trainingMaxYear,
                "forestPctLeft": forestPctleft,
                "accuracy": accuracy
            }
        )
        core_simulation_tracker.trainingMaxYear += 1

    df = pd.DataFrame(training_year_results)
    df.to_csv('../data/outputs/kmc_dynamic_yearly_forestloss_avg_200_runs.csv', index=False)
    return True


def call_dynamic_rate_kmc(simulation_tracker: KMCSimulationTracker):
    print(f"\n--- DYNAMIC RATES ---")
    dynamic_single_run_results = run_kmc_simulation_dynamic(simulation_tracker, 1)
    print(f"single run result: {dynamic_single_run_results}")
    dynamic_multiple_run_results = run_kmc_simulation_dynamic(simulation_tracker, 200)
    print(f"\n multiple runs result: {dynamic_multiple_run_results}")
    return True

def call_piecewise_rate_kmc(simulation_tracker: KMCSimulationTracker):
    print(f"\n--- PIECEWISE RATES ---")
    piecewise_single_run_results = run_kmc_simulation_piecewise(simulation_tracker, 1)
    print(f"single run result: {piecewise_single_run_results}")
    piecewise_multiple_run_results = run_kmc_simulation_piecewise(simulation_tracker, 200)
    print(f"\n multiple runs result: {piecewise_multiple_run_results}")
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
