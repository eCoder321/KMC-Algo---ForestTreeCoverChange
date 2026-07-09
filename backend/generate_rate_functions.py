import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit

from datamanip import get_piecewise_constants_per_year
from shared import STARTING_YEAR, EPSILON
from data_types import DynamicRate, LinearRate, LogLinearRate, KMCPiecewiseConstsConfig, KMCDynamicRateConfig

LOG_LINEAR_EVENTS = {"PERMANENT_AGRICULTURE", "LOGGED_DEGRADED"}


def _get_time_data_for_rates(yearly_rates: list[float] | np.ndarray):
    return np.arange(len(yearly_rates), dtype=float)


def fit_linear_rates(event_rate_constants: KMCPiecewiseConstsConfig) -> KMCDynamicRateConfig:
    fitted: KMCDynamicRateConfig = {}

    for event, yearly_rates in event_rate_constants.items():
        time_data = _get_time_data_for_rates(yearly_rates)
        y = np.array(yearly_rates, dtype=float)
        y = np.clip(y, EPSILON, None)

        if len(y) < 2:
            slope = 0.0
            intercept = float(y[0]) if len(y) > 0 else float(EPSILON)
        else:
            slope, intercept = np.polyfit(time_data, y, 1)

        fitted[event] = LinearRate(
            event=event,
            intercept=float(intercept),
            slope=float(slope),
            start_year=STARTING_YEAR,
        )

        # print(f"{event}: r(t) = {intercept:.8e} + {slope:.6f} * t")

    return fitted


def fit_log_linear_rates(event_rate_constants: KMCPiecewiseConstsConfig) -> KMCDynamicRateConfig:
    fitted: KMCDynamicRateConfig = {}

    for event, yearly_rates in event_rate_constants.items():
        time_data = _get_time_data_for_rates(yearly_rates)
        y = np.array(yearly_rates, dtype=float)
        y = np.clip(y, EPSILON, None)

        if len(y) < 2:
            k = 0.0
            ln_a = np.log(y[0]) if len(y) > 0 else np.log(EPSILON)
        else:
            k, ln_a = np.polyfit(time_data, np.log(y), 1)

        a = np.exp(ln_a)
        fitted[event] = LogLinearRate(
            event=event,
            a=float(a),
            k=float(k),
            start_year=STARTING_YEAR,
        )

        # print(f"{event}: r(t) = {a:.8e} * exp({k:.6f} * t)")

    return fitted


def build_dynamic_rate_models(event_rate_constants: KMCPiecewiseConstsConfig) -> KMCDynamicRateConfig:
    linear_rates = fit_linear_rates(event_rate_constants)
    log_linear_rates = fit_log_linear_rates(event_rate_constants)

    fitted: KMCDynamicRateConfig = {}
    for event in event_rate_constants:
        if event in LOG_LINEAR_EVENTS:
            fitted[event] = log_linear_rates[event]
        else:
            fitted[event] = linear_rates[event]

    return fitted


def optimize_curve(
    event_rate_constants: KMCPiecewiseConstsConfig,
    initial_rates: KMCDynamicRateConfig | None = None,
    time_data: np.ndarray | None = None,
) -> KMCDynamicRateConfig:
    if initial_rates is None:
        initial_rates = build_dynamic_rate_models(event_rate_constants)

    optimized_rates: KMCDynamicRateConfig = {}
    for event, event_rate_dynamic in initial_rates.items():
        rates = np.array(event_rate_constants[event], dtype=float)
        rates = np.clip(rates, EPSILON, None)

        if time_data is None:
            time_data_for_event = _get_time_data_for_rates(rates)
        else:
            time_data_for_event = np.array(time_data, dtype=float)

        if isinstance(event_rate_dynamic, LogLinearRate):
            def exp_func(t, a, k):
                return a * np.exp(k * t)

            popt, pcov = curve_fit(
                exp_func,
                time_data_for_event,
                rates,
                p0=[event_rate_dynamic.a, event_rate_dynamic.k],
                bounds=([1e-15, -np.inf], [np.inf, np.inf]),
            )
            a, k = popt
            perr = np.sqrt(np.diag(pcov))
            optimized_rates[event] = LogLinearRate(
                event=event,
                a=float(a),
                k=float(k),
                start_year=STARTING_YEAR,
            )
            # print(f"event: {event}")
            # print(f"Formula: r(t) = {a:.8e} * exp({k:.6f} * t)")
            # print(f"Uncertainty: a ± {perr[0]:.5e}, k ± {perr[1]:.5e}")
        else:
            def linear_func(t, intercept, slope):
                return intercept + slope * t

            popt, pcov = curve_fit(
                linear_func,
                time_data_for_event,
                rates,
                p0=[event_rate_dynamic.intercept, event_rate_dynamic.slope],
            )
            intercept, slope = popt
            perr = np.sqrt(np.diag(pcov))
            optimized_rates[event] = LinearRate(
                event=event,
                intercept=float(intercept),
                slope=float(slope),
                start_year=STARTING_YEAR,
            )
            # print(f"event: {event}")
            # print(f"Formula: r(t) = {intercept:.8e} + {slope:.6f} * t")
            # print(f"Uncertainty: intercept ± {perr[0]:.5e}, slope ± {perr[1]:.5e}")

    return optimized_rates


def plot_fits(event_rate_constants: KMCPiecewiseConstsConfig, fitted_rates: KMCDynamicRateConfig, years_to_plot: int = 30):
    for event, yearly_rates in event_rate_constants.items():
        y_obs = np.array(yearly_rates, dtype=float)
        time_data = _get_time_data_for_rates(yearly_rates)

        t_plot = np.linspace(0, years_to_plot - 1, 300)
        y_fit = fitted_rates[event](t_plot)

        plt.figure(figsize=(7, 4))
        plt.scatter(time_data, y_obs, label="Training yearly rates")
        plt.plot(t_plot, y_fit, label="Log-linear fit")
        plt.xlabel(f"Years since {STARTING_YEAR}")
        plt.ylabel("Rate")
        plt.title(event)
        plt.legend()
        plt.savefig(f"../data/outputs/figures/dynamic_rate_{event}")


if __name__ == "__main__":
    event_rate_constants = get_piecewise_constants_per_year()

    fitted_rates = build_dynamic_rate_models(event_rate_constants)
    optimized_rates = optimize_curve(event_rate_constants, fitted_rates)
    # plot_fits(event_rate_constants, fitted_rates, years_to_plot=30)

    fitted_rate_params = {event: model.as_dict() for event, model in fitted_rates.items()}
    print(f"fitted rate params: {fitted_rate_params}")