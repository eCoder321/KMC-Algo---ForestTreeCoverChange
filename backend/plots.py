import os
import numpy as np
import matplotlib.pyplot as plt

from datamanip import get_piecewise_constants_per_year
from generate_rate_functions import fit_log_linear_rates, optimize_curve
from shared import STARTING_YEAR
from data_types import KMCPiecewiseConstsConfig, KMCDynamicRateConfig


START_YEAR = STARTING_YEAR


def plot_all_events(event_rates: KMCPiecewiseConstsConfig):
    plt.figure(figsize=(10, 6))
    for event_name, rates in event_rates.items():
        years = [START_YEAR + i for i in range(len(rates))]
        plt.scatter(years, rates, label=event_name)

    plt.xlabel("Time (Years)")
    plt.ylabel("Rate (events/year)")
    plt.title("KMC Dynamic Rates Over Time (Focused View)")

    plt.ylim(0, 0.00035)
    plt.legend(title="Events", bbox_to_anchor=(1.02, 1), loc="upper left")
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.savefig("../data/outputs/rate_vs_time_non_ag_training.png", bbox_inches="tight")


def plot_event_rate_fits_across_datasets(
    half_rate_constants: KMCPiecewiseConstsConfig,
    full_rate_constants: KMCPiecewiseConstsConfig,
    half_initial_rates: KMCDynamicRateConfig,
    full_initial_rates: KMCDynamicRateConfig,
    half_optimized_rates: KMCDynamicRateConfig,
    full_optimized_rates: KMCDynamicRateConfig,
    output_dir: str = "../data/outputs/figures",
):
    os.makedirs(output_dir, exist_ok=True)

    events = sorted(set(half_rate_constants.keys()) | set(full_rate_constants.keys()))

    for event in events:
        half_rates = np.array(half_rate_constants[event], dtype=float) if event in half_rate_constants else np.array([])
        full_rates = np.array(full_rate_constants[event], dtype=float) if event in full_rate_constants else np.array([])

        if len(half_rates) == 0 and len(full_rates) == 0:
            continue

        full_years = np.arange(START_YEAR, START_YEAR + len(full_rates), dtype=float)
        full_years_for_projection = np.arange(START_YEAR, START_YEAR + max(len(half_rates), len(full_rates)), dtype=float)

        plt.figure(figsize=(10, 6))

        if len(full_rates) > 0:
            plt.scatter(full_years, full_rates, label="Data observed", color="#1f77b4", alpha=0.7, s=30)

        if len(half_rates) > 0:
            half_initial = half_initial_rates[event]
            half_optimized = half_optimized_rates[event]
            half_slope, half_intercept = np.polyfit(full_years_for_projection[:len(half_rates)], half_rates, 1)
            plt.plot(full_years_for_projection, [half_initial.at_year(year) for year in full_years_for_projection], label="Half-data initial exponential", linestyle="--", color="#4c72b0", linewidth=2)
            plt.plot(full_years_for_projection, [half_optimized.at_year(year) for year in full_years_for_projection], label="Half-data optimized exponential", linestyle="-", color="#4c72b0", linewidth=2)
            plt.plot(full_years_for_projection, half_slope * full_years_for_projection + half_intercept, label="Half-data best-fit line", linestyle=":", color="#4c72b0", linewidth=2)

        # if len(full_rates) > 0:
        #     full_initial = full_initial_rates[event]
        #     full_optimized = full_optimized_rates[event]
        #     full_slope, full_intercept = np.polyfit(full_years, full_rates, 1)
        #     plt.plot(full_years_for_projection, [full_initial.at_year(year) for year in full_years_for_projection], label="Full-data initial exponential", linestyle="--", color="#dd8452", linewidth=2)
        #     plt.plot(full_years_for_projection, [full_optimized.at_year(year) for year in full_years_for_projection], label="Full-data optimized exponential", linestyle="-.", color="#dd8452", linewidth=2)
        #     plt.plot(full_years_for_projection, full_slope * full_years_for_projection + full_intercept, label="Full-data best-fit line", linestyle=":", color="#dd8452", linewidth=2)

        plt.xlabel("Year")
        plt.ylabel("Rate")
        plt.title(f"{event} rate fits")
        plt.legend()
        plt.tight_layout()
        plt.savefig(f"{output_dir}/rate_fit_{event}_exp_vs_bestfit_half.png")
        plt.close()


if __name__ == "__main__":
    half_event_rate_constants = get_piecewise_constants_per_year()
    full_event_rate_constants = get_piecewise_constants_per_year(2024)

    fitted_rates_half = fit_log_linear_rates(half_event_rate_constants)
    optimized_rates_half = optimize_curve(half_event_rate_constants, fitted_rates_half)

    fitted_rates_full = fit_log_linear_rates(full_event_rate_constants)
    optimized_rates_full = optimize_curve(full_event_rate_constants, fitted_rates_full)

    plot_event_rate_fits_across_datasets(
        half_event_rate_constants,
        full_event_rate_constants,
        fitted_rates_half,
        fitted_rates_full,
        optimized_rates_half,
        optimized_rates_full,
    )