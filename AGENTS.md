This is the correct division of responsibilities for this project.
If you **_EVER_** violate this project structure, _I will fucking kill you._

```
source/
├── core/                 # Business logic layer
│   ├── domain/           # Entities, value objects, services
│   └── use-cases/        # Commands and queries
├── infrastructure/       # Technical implementations
│   ├── persistence/      # Redux store
│   └── platform/         # Platform-specific code
├── renderer/             # Canvas rendering engine
│   ├── core/             # Engine core
│   └── components/       # Visual components
├── surface/              # React UI layer
│   ├── components/       # UI components
│   └── containers/       # Smart components
└── config/               # Configuration
```
