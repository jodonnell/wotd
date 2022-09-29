import * as fs from 'fs'
import { parse } from 'node-html-parser'


const getWordApi =  async (word) => {
  const response = await fetch(`https://dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${process.env.KEY}`)
  return await response.json()
}

const getWordApiCached = async (word) => {
  const fileSafeWord = word.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const path = `./words-cached/${fileSafeWord}.json`

  try {
    const results = await fs.promises.readFile(path)
    return JSON.parse(results)
  } catch {
    const results = await getWordApi(word)
    await fs.promises.writeFile(path, JSON.stringify(results))
    return results
  }
}


const writeResults = async (results) => {
  await fs.promises.writeFile('./words.json', JSON.stringify(results))
}

const getWordData = async (word) => {
  const results = await getWordApiCached(word.name)
  results[0].name = word.name
  results[0].date = word.date
  return results
}

const get = async () => {
  const response = await fetch('https://www.merriam-webster.com/word-of-the-day/calendar')
  const text = await response.text()
  const root = parse(text);
  const htmlText = root.querySelectorAll('.more-wod-items li')

  const firstDate = new Date('Jul 25 2022')
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const words = htmlText.map((wotdUnparsed) => {
    let lines = wotdUnparsed.text.split('\n')
    lines = lines.map(line => line.trim()).filter(line => line.length > 0)
    const month = new Date(wotdUnparsed.parentNode.parentNode.querySelector('.title-container').text.trim())

    const date = new Date(`${lines[0]} ${month.getFullYear()}`)

    if ((date > firstDate) && (date < tomorrow))
      return { name: lines[1], date }
    return null
  }).filter(p => !!p)

  const wordsWithDefinitions = await Promise.all(words.map(async (word) => await getWordData(word)))
  const results = wordsWithDefinitions.map(p => ({ def: p[0].shortdef, name: p[0].name, date: p[0].date } ))

  await writeResults(results)
}

get()
