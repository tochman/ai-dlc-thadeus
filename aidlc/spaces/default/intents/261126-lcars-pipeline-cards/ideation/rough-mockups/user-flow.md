# User flow — watching the pipeline (US-0412)

Sources: Initial description: US-0412 story text [desc]; answers [Q2] [Q3].

```
Open an intent's Pipeline view
        |
        v
[Full?] --yes--> power-up: cards light up in order (<= 600ms) [Q3: every open]
        |no
        v
Cards shown at once (Reduced / Off)
        |
        v
Work runs; the app reads the records
        |
        +--> a stage changes state ------> sweep across that card (Full)
        |
        +--> a unit is approved ---------> new level segment grows (Full)
        |
        +--> a stage becomes done -------> two flashes, settle to done outline (Full)
        |                                   Reduced/Off: done outline at once
        v
Click or Enter on a card -> its files open below (unchanged from US-0411)
```

- Effects play only for changes seen while the view is open; opening the view again plays the power-up, not old sweeps or flashes.
- Effects never change what the card says or how it is read out; they are decoration only.
