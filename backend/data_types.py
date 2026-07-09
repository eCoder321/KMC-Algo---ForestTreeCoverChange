from collections import defaultdict
from dataclasses import dataclass
from enum import Enum

import numpy as np

TRAINING_DATA_CUTOFF = 2012

@dataclass
class DynamicRate:
    event: str
    start_year: int

    def __call__(self, t: float) -> float:
        raise NotImplementedError

    def at_year(self, year: float) -> float:
        return self(float(year - self.start_year))

    def as_dict(self) -> dict:
        return {
            "event": self.event,
            "start_year": self.start_year,
        }


@dataclass
class LinearRate(DynamicRate):
    intercept: float
    slope: float

    def __call__(self, t: float) -> float:
        return self.intercept + self.slope * t

    def as_dict(self) -> dict:
        data = super().as_dict()
        data.update({"intercept": self.intercept, "slope": self.slope})
        return data


@dataclass
class LogLinearRate(DynamicRate):
    a: float
    k: float

    def __call__(self, t: float) -> float:
        return self.a * np.exp(self.k * t)

    def as_dict(self) -> dict:
        data = super().as_dict()
        data.update({"a": self.a, "k": self.k})
        return data


@dataclass
class KMCSimulationTracker:
    startingYear: int
    targetYear: int
    trainingMaxYear: int = TRAINING_DATA_CUTOFF
    currentYear: int = 0
    forestPctLeft: float = 100
    currentTime: float = 0
    toForested: int = 0
    toAgriculture: int = 0
    toBurned: int = 0
    toOther: int = 0
    toLogged: int = 0
    toSettlement: int = 0
    gridSize: int = 40


KMCDynamicRateConfig = defaultdict[str, DynamicRate]
KMCPiecewiseConstsConfig = defaultdict[str, list[np.float64]]


@dataclass
class LocalMultipliers:
    # Local Multipliers (Neighborhood Sensitivity)
    alpha: float  # Ag pressure
    beta1: float  # Fire spread
    gamma: float  # Logging pressure
    delta: float  # Other dist pressure
    eta: float  # Settlement pressure
    kappa1: float  # Forest pressure on temp disturbance cells
    kappa2: float  # Permanent Ag pressure on temp disturbance cells
    multiplierBtoA: float
    multiplierBtoO: float
    multiplierLtoA: float
    multiplierLtoB: float
    multiplierLtoO: float
    multiplierOtoA: float
    multiplierOtoB: float


@dataclass
class KMCFixedRateConfig:
    gridSize: int
    rateFtoA: float  # rate to go from Forested to Permanent Agriculture
    rateFtoB: float
    rateFtoL: float
    rateFtoO: float
    rateFtoS: float
    regrowthBaseRate: float
    # Local Multipliers (Neighborhood Sensitivity)
    alpha: float  # Ag pressure
    beta1: float  # Fire spread
    gamma: float  # Logging pressure
    delta: float  # Other dist pressure
    eta: float  # Settlement pressure
    kappa1: float  # Forest pressure on temp disturbance cells
    kappa2: float  # Permanent Ag pressure on temp disturbance cells
    # heuristics for other transitions
    rateBtoA: float
    rateBtoO: float
    rateLtoA: float
    rateLtoB: float
    rateLtoO: float
    rateOtoA: float
    rateOtoB: float


class CellType(Enum):
    FORESTED = "FORESTED"
    PERMANENT_AGRICULTURE = "PERMANENT_AGRICULTURE"
    BURNED = "BURNED"
    LOGGED_DEGRADED = "LOGGED_DEGRADED"
    OTHER_TEMP_DISTURBANCE = "OTHER_TEMP_DISTURBANCE"
    SETTLEMENT_INFRASTRUCTURE = "SETTLEMENT_INFRASTRUCTURE"