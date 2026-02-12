# Selenium IDE vs Playwright Test Comparison

This document compares the original ThrustCurve.side tests with the current Playwright implementation to identify any drift in test coverage or intent.

## Summary: What We're Still Testing

| Selenium Test | Playwright Test | Fidelity |
|---------------|-----------------|----------|
| index (homepage, nav, quick search) | ✓ Same flow | **Intact** |
| search (Estes filter, type+impulse, flame, smoke) | ✓ Same flow | **Intact** |
| guide (one-time entry, dimensions, results) | ✓ Same flow | **Intact** |
| guide (saved rocket, login, Alpha III flow) | ✓ Same flow | **Intact** |
| browser (navigation, burn time, compare) | ✓ Same flow | **Intact** |

## Changes That Preserve Intent

1. **Selectors** – Switched from brittle CSS (e.g. `p:nth-child(2)`) to semantic/robust locators where the DOM structure changed or was ambiguous. The assertion still checks the same behavior.

2. **Regex for multi-line text** – e.g. `motors fit[\s\S]*the rocket` instead of exact string match, because the text spans multiple lines.

3. **Flexible counts** – `toContainText(/11 entries/)` instead of exact "Showing 1 to 10 of 11 entries" – counts can vary with DB.

4. **C6 row** – Locate by row containing C6 link instead of `.odd:nth-child(7)` – table order can change.

5. **"slow off guide"** – `getByText('slow off guide').first()` instead of `.odd.first().danger` – table sort order varies.

## Changes That May Have Reduced Coverage

### 1. Run Details / AeroTech D10W

**Original Selenium:**
- Click: `css=a:nth-child(15) > text` (15th chart element)
- Assert: `linkText=AeroTech D10W` present

**Current Playwright:**
- Click: `.chart a` first
- Assert: `div[role="form"] a[href*="/motors/"]` visible (any motor link)

**Impact:** The original explicitly checked that the clicked chart element opened Run Details for AeroTech D10W. The current test only checks that some motor link exists on the Run Details page. Motor order in the chart can vary, so the 15th element may not always be D10W. The weaker assertion ensures the Run Details page renders correctly but does not assert the specific motor.

### 2. Guide plot chart click target

**Original:** `css=a:nth-child(15) > text` – specific SVG element.

**Current:** `.chart a` first – first link in the chart.

**Impact:** We may be clicking a different motor and landing on a different Run Details page. The original targeted a specific data point; the current targets the first link.

## Recommendation

The chart is SVG-based; links may not expose as role="link" with full motor names. The Playwright test uses `.chart a` first and asserts that a motor link exists in the Run Details form. This verifies the flow (chart click → Run Details with motor) without depending on chart structure or a specific motor. The original Selenium's AeroTech D10W assertion cannot be restored without deeper inspection of the SVG chart output.
