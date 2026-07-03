from dataclasses import dataclass
from enum import Enum
from collections import defaultdict
import numpy as np

@dataclass
class KMCSimulationTracker:
    startingYear: int
    targetYear: int
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


KMCDynamicRateConfig = defaultdict[str, list[np.float64]]

@dataclass
class LocalMultipliers:
    # Local Multipliers (Neighborhood Sensitivity)
    alpha: float; # Ag pressure
    beta1: float; # Fire spread
    gamma: float; # Logging pressure
    delta: float; # Other dist pressure
    eta: float;   # Settlement pressure
    kappa1: float; # Forest pressure on temp disturbance cells
    kappa2: float; # Permanent Ag pressure on temp disturbance cells
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
    rateFtoA: float #rate to go from Forested to Permanent Agriculture
    rateFtoB: float
    rateFtoL: float
    rateFtoO: float
    rateFtoS: float
    regrowthBaseRate: float
    # Local Multipliers (Neighborhood Sensitivity)
    alpha: float; # Ag pressure
    beta1: float; # Fire spread
    gamma: float; # Logging pressure
    delta: float; # Other dist pressure
    eta: float;   # Settlement pressure
    kappa1: float; # Forest pressure on temp disturbance cells
    kappa2: float; # Permanent Ag pressure on temp disturbance cells
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