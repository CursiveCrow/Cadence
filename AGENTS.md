Every **file** should have exactly one responsibility. Any files that are over 500 lines must be evaluated for violating this rule.

This is the correct division of responsibilities for this project. If you **EVER** violate this project structure _I will fucking kill you._

source/
├── core/ # Business logic layer
│ ├── domain/ # Entities, value objects, services, interfaces/ports
│ └── use-cases/ # Commands and queries
├── infrastructure/ # Technical implementations
│ ├── persistence/ # Redux store
│ └── platform/ # Platform-specific code
├── renderer/ # Canvas rendering engine
│ ├── core/ # Engine core
│ └── components/ # Visual components
├── surface/ # React UI layer
│ ├── components/ # UI components
│ └── containers/ # Smart components
└── config/ # Configuration
