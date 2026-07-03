import pandas as pd
from pathlib import Path
from collections import defaultdict
from data_types import CellType, KMCDynamicRateConfig


indataset = "../data/inputs/consolidated_tree_cover_details_south_amazon.xlsx"
outdata = "../data/outputs/"
REGROWTH_YEARS = 19
STARTING_YEAR = 2000


def get_piecewise_constants_per_year() -> KMCDynamicRateConfig:
    """
    returns the piecewise rate constants per year (i.e. the loss_ha/total_remaining_forest_area per event-year)
    
    Args:
        raw_dat: dataframe from excel/csv file
    
    Returns: 
        event_rates: a dictionary of each event, with an array of the event's rates
    """
    df = pd.read_excel(indataset)
    tree_cover_at_risk = df["tree_cover_extent_2000__ha (starting tree cover in 2000)"].iloc[0]
    tree_cover_gain_yearly = float(df["tree_cover_gain__ha (2000-2020)"].iloc[0]) / REGROWTH_YEARS #assuming uniform regrowth ha per year
    # print(f"tree cover at risk: {tree_cover_at_risk}")
    aggregated_df = aggregate_tree_cover_loss(df, outdata)
    # training_df = aggregated_df[aggregated_df['loss_year'] <= 2012]
    
    event_rates = defaultdict(list)
    current_year = STARTING_YEAR
    for row in aggregated_df.itertuples():
        yearly_rate = row.loss_area_ha / tree_cover_at_risk
        event_rates[row.refined_event].append(yearly_rate)
        tree_cover_at_risk -= row.loss_area_ha
        # adding the yearly regrowth for the 19 regrowth years -
            # technically we keep adding for training data up till 2012, but I tested this first with the full dataset. doesn't hurt keeping it for design changes
        if(row.loss_year > current_year and row.loss_year <= STARTING_YEAR + REGROWTH_YEARS ):
            tree_cover_at_risk += tree_cover_gain_yearly
            current_year = row.loss_year

    # print(f"events rates: {event_rates}")
    # print("event rates: ", list(event_rates.items())[:1])
    # print(f"final tree cover left: {tree_cover_at_risk}")
    # print(f"yearly tree vover gain: {tree_cover_gain_yearly}")

    return event_rates


def aggregate_tree_cover_loss(df, output_dir=None):
    """
    Aggregate tree cover loss data by refined event and year.
    
    Args:
        df: dataframe from excel/csv file
        output_dir: Directory to save CSV outputs (optional)
    
    Returns:
        pivot_df
    """
    # Driver mapping to refined events
    driver_map = {
        "Permanent agriculture": CellType.PERMANENT_AGRICULTURE.value,
        "Hard commodities": CellType.PERMANENT_AGRICULTURE.value,
        "Wildfire": CellType.BURNED.value,
        "Logging": CellType.LOGGED_DEGRADED.value,
        "Other natural disturbances": CellType.OTHER_TEMP_DISTURBANCE.value,
        "Shifting cultivation": CellType.OTHER_TEMP_DISTURBANCE.value,
        "Unknown": CellType.OTHER_TEMP_DISTURBANCE.value,
        "Settlements & Infrastructure": CellType.SETTLEMENT_INFRASTRUCTURE.value,
    }
    
    # Load and process
    df.columns = [c.strip() for c in df.columns]
    df["refined_event"] = df["drivers_type"].map(driver_map)
    df_refined = df.dropna(subset=["refined_event"]).copy()
    
    # Aggregate
    agg = (
        df_refined
        .groupby(["refined_event", "loss_year"], as_index=False)["loss_area_ha"]
        .sum()
        .sort_values(["loss_year", "refined_event"])
    )
        
    # Save if output dir specified
    if output_dir:
        agg.to_csv(f"{output_dir}/refined_event_year_loss_area.csv", index=False)
    
    return agg