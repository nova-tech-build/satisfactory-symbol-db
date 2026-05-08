import {createList} from './list.ts'


document.addEventListener('DOMContentLoaded', () => {
  createList('/generated/all.json', 'All Characters')
    .catch(console.error)
})

