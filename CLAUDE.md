# Ian Andreu portfolio: notes for Claude

Static GitHub Pages site (ianandreu.com), vanilla HTML/CSS/JS, no build step. Push to `master` to deploy.
Ian is not a web developer anymore and isn't looking for work. The site is for fun: playful, a bit silly.

## Working with Ian
- Plain-language reports. Explain hidden features and how to trigger them.
- I can't hear audio. Say so honestly and let him judge sounds.
- Client project links stay exactly as they are. Nothing is saved between visits: a refresh resets all state.
- Check in a browser (Playwright is installed) before saying something works. Test at desktop and ~390px wide.
- Commit and push when a piece is done. Commit messages end with the attribution trailers from the session reminder.

## Layout
- `index.html`: the page. Bands (`.blocks`) repeat down the page; `#loop` holds them. Hidden elements for effects:
  `#mookie` (blessing), `#runner`, `#bird`, `#laser`, `#chaser`, `#commando`. Project hover text is in `.description` (`#desc-N`).
- `css/styles.css`: all styles. Fonts: Righteous (site), Caveat (easter-egg notepad), from Google Fonts.
- `javascripts/scripts.js`: one IIFE with everything (bands/colours, easter eggs, notepad).
- `css/images/`: band cat frames (`1-16.webp`), `mookie.webp`, sprite sheets `runner.png`, `bird.png`, `chaser.png`, `commando.png`.
- `sounds/`: Mookie's real recordings (`mookie-meow.mp3`, `mookie-purr.mp3`, `mookie-chirp.mp3`). The hiss is synthesized.
- `blackjack2/`: separate page, "Blackjack 2" (a polished rebuild of Ian's 2015 game, with roast notes). Has its own `js/engine.js` (rules), `js/app.js`, `js/roasts.js`.
- Ian's original blackjack lives in a different repo (`niddy1/Blackjack`, branch `gh-pages`, served at /blackjack). It is a relic: only change is one fancy "the REAL one" chip linking to /blackjack2/. Leave the rest alone.

## Easter eggs (the notepad lists 12; names are the visitor-facing list, triggers are secret)
| Name on the list | How it's triggered |
|---|---|
| Konami Code | up up down down left right left right B A: Commando Mookie runs across the bottom firing a 5-way spread |
| Fly By | a bird flies across: press and hold anywhere 2 seconds, or a random fly-by 60-150s after load (40% chance) |
| You chirping at me?? | bird nearby while the running cat is out: he stops and chirps |
| Marathon Man | running cat crosses the screen 3 times in one run (hold the right arrow) |
| The Blessing | click empty space 10 times: Mookie blesses you. Ignores clicks for the first 1.5s |
| Purr Factory | pet the footer cat 10 times: rain of cat faces |
| Fricken Laser Beams | Shift + hold the mouse (or finger held 4s): red laser dot, top-down Mookie chases it |
| Taste the Rainbow | change colours 10 times (button or space; the Konami party's automatic swaps don't count): pixel rainbow, then candy rain. Notepad waits until it's gone |
| Kraven the Hunter | Commando pellets hit the bird: he caws, freezes, falls |
| Hissy Fit | the footer cat hisses (running cat meets him) |
| Bop | running cat jumps over the footer cat (up arrow) |
| Scroll Master | click the "scroll" link in the footer |
- Also: typing "cat" rains cats (doesn't count for Purr Factory); 3 right-arrow taps summon the running cat; tab-title mischief; the footer cat peeks up at the end of the page.
- Notepad: `EGGS` / `EGG_ORDER` / `foundEgg(id)` near the top of `scripts.js`. Add a new egg by adding a name, appending to `EGG_ORDER`, and calling `foundEgg('id')` where it triggers. Crossings queue so they animate one after another.

## Analytics
Google Analytics tag in `index.html` (G-8XMXV3M277). `foundEgg` sends an `easter_egg_found` event with `egg_id`, `egg_name`, `eggs_found` (count so far this visit) and `eggs_total`.
Needs event-scoped custom dimensions (`egg_name`, `eggs_found`) in GA Admin to report on.

## Gotchas learned the hard way
- Individual CSS properties (`translate`, `rotate`, `scale`) apply *outside* `transform`. The bird is positioned with `translate` so `rotate` spins it in place.
- Reduced-motion: effects the visitor triggers on purpose still run; only ambient ones (random bird, palette flow) respect it.
- The desc panel opens on hover and on keyboard focus only (`:focus-visible`); a mouse click leaves focus on the link and used to leave the panel stuck.
- Page scrolls horizontally slightly on the original blackjack; not ours to fix.
- GitHub Pages can take a minute or two to update, and browsers cache: hard refresh to see changes.
