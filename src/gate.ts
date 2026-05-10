
const PASSWORD: string = 'beams'

if (sessionStorage.getItem('unlocked') !== 'yes') {
  const input: string | null = prompt('Password')

  if (input !== PASSWORD) {
    document.documentElement.innerHTML = '<h1>Under development - Nova</h1>'
    throw new Error('Access denied')
  }

  sessionStorage.setItem('unlocked', 'yes')
}
