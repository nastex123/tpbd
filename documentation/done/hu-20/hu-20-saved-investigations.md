# HU-20 Saved Investigations

- Epic: Future enhancements
- Owner: Brandon
- Branch: feature/hu-20-saved-investigations
- Pull request: See associated pull request
- Status: Ready for review

## Story and acceptance criteria

Users can save and reopen their investigation settings on the current device.

- The user can save a name, variable, primary location, optional comparison, time period, and NASA POWER reference.
- Loading restores the selection and period when the variable, region, and range are currently available.
- Entries can be deleted. Data remains unchanged when storage is invalid or a save fails.
- The persisted schema accepts only explicitly selected fields; credentials and arbitrary extra properties are discarded.

## Technical implementation

Investigations are stored in a versioned localStorage key for the current Electron or browser origin. Input is validated on read and before write. The store is capped at 50 entries and does not persist computed climate values or authentication data.

## Verification

- `npm.cmd run test:investigations` passed save, restore, delete, invalid coordinate, corrupt storage, and extra-field checks.
- `npm.cmd run build` passed TypeScript and Vite compilation.
- Manual Electron review and a restart check remain pending.

## Pending work

Electron development and compiled file modes use separate storage origins. Investigations are local to each origin and are not synchronized or exported. HU-19 covers report export.
