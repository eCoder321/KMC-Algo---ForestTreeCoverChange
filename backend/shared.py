from data_types import KMCSimulationTracker, LocalMultipliers

#constant regrowth rate by year
REGROWTH_RATE = 0.0000685

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
