# ngx-formz
Opinionated Angular Forms library.

## Project Setup

### Git

Add local git configurations on project level:

```zsh
$ git config --local user.name <username>
$ git config --local user.email <useremail>

# configure VS Code as the default editor
$ git config --local core.editor "code --wait"

# configure 'merge' strategy
$ git config pull.rebase false

# configure auto-setup of new branches
$ git config push.autoSetupRemote true
```

### asdf

Install [asdf for macOS](https://asdf-vm.com/guide/getting-started.html)
The `asdf` tools used for this project are listed in `.tool-versions`.

Commands, e.g. `nodejs`:

```zsh
$ asdf list all nodejs
$ asdf install nodejs <version> # if not installed on machine
$ asdf local nodejs <version> # to update local usage

# verify local usage
$ asdf current
```

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.