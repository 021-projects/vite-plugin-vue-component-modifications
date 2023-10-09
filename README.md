# vite-plugin-vue-component-modifications

<a href="https://www.npmjs.com/package/vite-plugin-vue-component-modifications" target="_blank"><img alt="Version" src="https://img.shields.io/npm/v/vite-plugin-vue-component-modifications?style=flat-square"/></a>
<a href="https://www.npmjs.com/package/vite-plugin-vue-component-modifications" target="_blank"><img src="https://img.shields.io/npm/dw/vite-plugin-vue-component-modifications?style=flat-square" alt="Downloads"></a>
<a href="https://www.npmjs.com/package/vite-plugin-vue-component-modifications" target="_blank"><img src="https://img.shields.io/npm/l/vite-plugin-vue-component-modifications?style=flat-square" alt="License"></a>

## Why?

The current Vue implementation does not allow building extensible CMS on it.
This plugin was created to solve this problem. 
It parses modification files (`.vuem`) in the specified directories and modifies the components at compile time.
Which means that components can be extended with countless add-ons without running code in production to modify it.

The plugin also supports Hot Update mode.

## Installation

```bash
npm i vite-plugin-vue-component-modifications -D
```

## Usage

```js
// vite.config.js
import vue from '@vitejs/plugin-vue'
import vueComponentModifications from 'vite-plugin-vue-component-modifications'
import path from 'path'

export default {
  plugins: [
    // Must be placed before vue() plugin
    vueComponentModifications({
      dirs: [
        path.resolve(__dirname, 'src/modifications'),
      ],
      files: [
        // path.resolve(__dirname, 'src/modifications/HelloWorld.vuem'),
      ],
      skip: [
        // Modificiations will not be applied to files with name config.js
        // 'config.js',
        
        // Modificiations will not be applied to files in dangerous directory
        // /\/dangerous\//,
      ]
    }),
    vue(),
  ],
}
```

## Usage

```vue
<!-- src/components/HelloWorld.vue -->
<script setup>
  defineProps({
    msg: {
      type: String,
      required: true
    }
  })
</script>

<template>
  <div class="greetings">
    <h1 class="green">{{ msg }}</h1>
    <h3>
      You’ve successfully created a project with
      <a href="https://vitejs.dev/" target="_blank" rel="noopener">Vite</a> +
      <a href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a>
    </h3>
  </div>
</template>

<style scoped>
  h1 {
    font-weight: 500;
    font-size: 2.6rem;
    position: relative;
    top: -10px;
  }

  h3 {
    font-size: 1.2rem;
  }

  .greetings h1,
  .greetings h3 {
    text-align: center;
  }

  @media (min-width: 1024px) {
    .greetings h1,
    .greetings h3 {
      text-align: left;
    }
  }
</style>
```

```vue
<!-- src/modifications/HelloWorld.vuem -->

<!-- Add new link after Vue 3 -->
<template after="Vue 3<\/a>">
  + <a href="https://example.com" target="_blank" rel="noopener">New Link</a>
</template>

<!-- Extend props to add customMsg prop -->
<script before="msg: {">
  customMsg: {
    type: String,
    default: ''
  },
</script>

<!-- Add display of customMsg -->
<template find="{{ msg }}" replace="$S" trim>
  {{ customMsg ? customMsg : msg }}
</template>

<!-- Append new css to the style tag -->
<style>
  h1 {
    font-size: 3rem;
  }
</style>
```

Now the `HelloWorld.vue` component will be compiled as follows:

```vue
<!-- src/components/HelloWorld.vue with applied modifications -->
<script setup>
  defineProps({
    customMsg: {
      type: String,
      default: ''
    },
    msg: {
      type: String,
      required: true
    }
  })
</script>

<template>
  <div class="greetings">
    <h1 class="green">{{ customMsg ? customMsg : msg }}</h1>
    <h3>
      You’ve successfully created a project with
      <a href="https://vitejs.dev/" target="_blank" rel="noopener">Vite</a> +
      <a href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a>
      + <a href="https://example.com" target="_blank" rel="noopener">New Link</a>
    </h3>
  </div>
</template>

<style scoped>
  h1 {
    font-weight: 500;
    font-size: 2.6rem;
    position: relative;
    top: -10px;
  }

  h3 {
    font-size: 1.2rem;
  }

  .greetings h1,
  .greetings h3 {
    text-align: center;
  }

  @media (min-width: 1024px) {
    .greetings h1,
    .greetings h3 {
      text-align: left;
    }
  }
  h1 {
    font-size: 3rem;
  }
</style>
```

## Modification file syntax

### File
Allow to specify the pattern for the names of the files to which the modification will be applied.<br>
Default: `[modification filename].vue`

Under the hood, the plugin creates a regular expression filter from this pattern. 
That is, the modification will be applied to all files that match this regular expression (except for files with the `.vuem` extension).

#### Examples
Will be applied to files named `HelloWorld.vue`:
```vue
<file>HelloWorld.vue</file>
```

Will be applied to files named `HelloWorld.vue` in `components` directory:
```vue
<file>components/HelloWorld.vue</file>
```

Will be applied to files named `HelloWorld.vue` or `GoodbyeWorld.vue`:
```vue
<file regex>(Hello|Goodbye)World\.vue</file>
```

### Template, Script, Style

Using these tags we can specify the place where the modification will be applied.<br>
These tags have accept attributes:

`before` – the tag content will be applied before the content matching the specified regular expression.<br>
`after` – the tag content will be applied after the content matching the specified regular expression.<br>
`find` – the tag content will be applied instead of the content matching the specified regular expression.<br>
`replace` – controls how the matching content will be replaced. The `$S` keyword will be replaced with the tag contents.<br>
`trim` – if this attribute is present, the tag content will be trimmed before replace.

If the `after`, `before` and `find` attributes are not specified, the tag content will be appended to the end of the corresponding component tags.

Look at the usage example above to see how these tags work.

### Extension of regular JS/TS files

```js
<!-- src/main.js -->
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

```vue
<!-- src/modifications/mainjs.vuem -->
<file>src/main.js</file>

<script after="mount\('\#app'\)" trim>
  .use(SomePlugin);
  
  console.log('Hello from modification!');
</script>
```

Result:
```js
<!-- src/main.js -->
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app').use(SomePlugin);

console.log('Hello from modification!');
```
