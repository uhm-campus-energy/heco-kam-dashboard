# HECO KAM View

Static recreation of the [UH Energy HECO KAM View](https://public.tableau.com/app/profile/uhm.energy/viz/HECOKAMView/DetailedkWhUsage) Tableau workbook. Billing rows come from `heco_kam_view.csv` (not from Tableau at runtime).

Python (`scripts/prepare_data.py`) turns the CSV into `public/data/bills.json`. React + Plotly render the seven tabs and filters for GitHub Pages.

## Local

```bash
python3 scripts/prepare_data.py
npm install
npm run dev
```

## GitHub Pages

https://uhm-campus-energy.github.io/heco-kam-dashboard/
