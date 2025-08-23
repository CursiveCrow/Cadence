Using dotnet10 and avalonia ui; create a desktop application following standard MVVM practices and folder-heirarchy. This program is called 'Cadence', and is a project managemnet system inspired by musical composition. The program should allow a user to create projects -- called 'Scores'. Scores are composed of 'measures' (time slices/features) which are composed of 'chords' which are composed of 'notes'. Notes are the atomic 'task' unit.

The user should be able to create and edit Scores. Scores should have settings for a start and end date, the 'tempo' of the project (which determines how many 'notes' can fit into a single chord). The user should also be able to create and edit notes. Notes should have settings for 'duration' as well as be able to 'depend' on other notes.

Notes within a project should automatically arrange themselves sequentially and into 'chords' based on the project's tempo and the notes dependancy chains.

Scores should be displayed as long, horizontal bars and multiple Scores should be positioned vertically from one another. Notes should appear as horizontal pills underneath their associated Score. Notes in a 'chord' should be stacked vertically.

Search the internet and use your tools to gather necessary context, API, and any other information needed to correctly, and completely build this application.

The UI should be modern and sleek. With a touch of old-world line-staff music sheet aesthetic.
