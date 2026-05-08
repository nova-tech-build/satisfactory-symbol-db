import {createList} from './list.ts'


document.addEventListener('DOMContentLoaded', () => {
  createList('/generated/all.json')
    .catch(console.error)
})

