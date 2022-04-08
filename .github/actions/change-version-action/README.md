# Change version docker action

This action change the module version and dependence version in pyproject.toml file.  

And module version in package.json file.

## Inputs

## `version`

**Required** The number of version. 

## Example usage
```yaml
- name: Change version of all module
  uses: ./.github/actions/change-version-action/
  id: change-version
  with:
    version: ${{ github.event.inputs.version }}
```