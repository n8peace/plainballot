# Hub card

`hub-card.png` (1600 x 1000) is the Plain Ballot card for natepeace.com and the Banana Intelligence wall. `hub-card.html` is its source.

Content: Governor of California, housing and taxes, from `data/positions/governor-california.json` in open-election-data (a race a person reviewed). Positions use the product's own dials and short labels from `lib/issues.ts`.

Re-render:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1600,1000 --virtual-time-budget=8000 --screenshot=hub-card.png "file://$PWD/hub-card.html"
```
