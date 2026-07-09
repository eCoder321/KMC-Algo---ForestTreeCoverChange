import numpy as np
from data_types import KMCSimulationTracker, LocalMultipliers

#constant regrowth rate by year
REGROWTH_RATE = 0.0000685

#dataset starting year and training data cutoff
STARTING_YEAR = 2001
TRAINING_DATA_CUTOFF = 2012
FINAL_FOREST_PCT = 93.8581078



EPSILON = 1e-12 #epsilon - values too low that it's considered 0

def create_local_multipliers() -> LocalMultipliers:
    return LocalMultipliers(
        alpha=0.25,
        beta1=0.35, 
        gamma=0.10, 
        delta=0.08, 
        eta=0.15, 
        kappa1=0.15, 
        kappa2=0.15,
        multiplierBtoA=0.5,
        multiplierBtoO=0.2,
        multiplierLtoA=0.8,
        multiplierLtoB=1.5,
        multiplierLtoO=0.3,
        multiplierOtoA=0.4,
        multiplierOtoB=1
    )


def calculate_accuracy(num: float):
    error_rate = abs(num - FINAL_FOREST_PCT)/FINAL_FOREST_PCT * 100
    return 100 - error_rate