# Valheim macOS Mod Template

A minimal template for creating Valheim mods with BepInEx on macOS.

## Prerequisites

- macOS with Valheim installed via Steam
- .NET SDK 8.0+ (`brew install dotnet`)
- [BepInEx for macOS](https://github.com/BepInEx/BepInEx/releases) installed in Valheim
- Publicized assemblies in `Managed/publicized_assemblies/`

## Quick Start

```bash
cd Template
./rename-mod.sh YourModName YourAuthorName
dotnet build
```

The built DLL will be in `bin/Debug/`. Copy it to `Valheim/BepInEx/plugins/`.

## Configuration

Edit `Environment.props` if your Steam library is in a non-standard location. By default it uses `$HOME/Library/Application Support/Steam/steamapps/common/Valheim`.

## License

MIT
