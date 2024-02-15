const TIME_COLUMN_START_INDEX = 3
function parseCommandLineArgument() {
  // console.log(Bun.argv)

  const combine = Bun.argv.indexOf('-c') === -1 ? false : true
  const log = Bun.argv.indexOf('--log') === -1 ? false : true

  let indexOfInFileFlag = Bun.argv.indexOf('-f')
  if (indexOfInFileFlag === -1) {
    indexOfInFileFlag = Bun.argv.indexOf('--file')
  }

  if (indexOfInFileFlag === -1) {
    console.error('Please provide file argument using file flag')
    process.exit(-1)
  }

  if (!Bun.argv[indexOfInFileFlag + 1]) {
    console.error('Please provide file path after file flag')
    process.exit(-1)
  }

  let outFilePath = `./${Bun.argv[indexOfInFileFlag + 1]}_custom${
    combine ? '_combined' : ''
  }.csv`

  let indexOfOutFileFlag = Bun.argv.indexOf('-o')
  if (indexOfOutFileFlag === -1) {
    indexOfOutFileFlag = Bun.argv.indexOf('--out')
  }

  if (indexOfOutFileFlag !== -1 && Bun.argv[indexOfOutFileFlag + 1]) {
    outFilePath = Bun.argv[indexOfOutFileFlag + 1]
  }

  if (indexOfOutFileFlag !== -1 && !Bun.argv[indexOfOutFileFlag + 1]) {
    console.error('Please provide out file path after file flag')
    process.exit(-1)
  }

  return {
    inFilePath: Bun.argv[indexOfInFileFlag + 1],
    outFilePath,
    combine,
    log,
  } as const
}

async function getFileContent(filePath: string) {
  return await Bun.file(filePath).text()
}

async function writeToFile(data: string, outfilePath: string) {
  await Bun.write(outfilePath, data)
}

function dataProcessingPerDetector(data: string) {
  const lines = data.split('\n')

  const processedDataList: string[] = []
  processedDataList.push(
    [
      'NB_SCATS_SITE',
      'NB_DETECTOR',
      (() => {
        const time: string[] = []
        for (let i = 0; i < 24; i++) {
          time.push(
            `${i.toString().padStart(2, '0')}00-${
              ((i + 1) % 24).toString().padStart(2, '0')
            }00`,
          )
        }
        return time.join(',')
      })(),
      'NM_REGION',
      'QT_VOLUME_24HOUR',
      'SUM_24HOUR',
    ].join(','),
  )

  const endIndex = lines.length
  for (let i = 1; i < endIndex - 1; i++) {
    const processedLine: string[] = []
    const columns = lines[i].split(',')
    const nbScatsSite = columns[0]
    const nbDetector = columns[2]
    const perHour: number[] = []
    let sum = 0
    for (let j = 0; j < 96; j += 4) {
      let perHourTime = parseInt(columns[TIME_COLUMN_START_INDEX + j]) +
        parseInt(columns[TIME_COLUMN_START_INDEX + j + 1]) +
        parseInt(columns[TIME_COLUMN_START_INDEX + j + 2]) +
        parseInt(columns[TIME_COLUMN_START_INDEX + j + 3])

      if (perHourTime < 0) {
        perHourTime = -1
      }
      sum += perHourTime
      perHour.push(perHourTime)
    }
    const nmRegion = columns[3 + 96] //.replaceAll('"', '')
    const qtVolumn24 = columns[5 + 96]
    processedLine.push(
      nbScatsSite,
      nbDetector,
      perHour.join(','),
      nmRegion,
      qtVolumn24,
      sum.toString(),
    )

    processedDataList.push(processedLine.join(','))
  }
  return processedDataList.join('\n')
}

function dataProcessingCombinedDetector(data: string) {
  const lines = data.split('\n')

  const processedDataList: string[] = []
  processedDataList.push(
    [
      'NB_SCATS_SITE',
      (() => {
        const time: string[] = []
        for (let i = 0; i < 24; i++) {
          time.push(
            `${i.toString().padStart(2, '0')}00-${
              ((i + 1) % 24).toString().padStart(2, '0')
            }00`,
          )
        }
        return time.join(',')
      })(),
      'NM_REGION',
      'QT_VOLUME_24HOUR',
      'SUM_24HOUR',
    ].join(','),
  )

  let LastScatsSiteId = lines[1].split(',')[0]
  const lastDetectorPerHour: number[] = Array<number>(24)
  for (let i = 0; i < 24; i++) {
    lastDetectorPerHour[i] = 0
  }

  const endIndex = lines.length
  let lastSum = 0
  let qtVolumn24Sum = 0
  for (let i = 1; i < endIndex - 1; i++) {
    const processedLine: string[] = []
    const columns = lines[i].split(',')
    const perHour: number[] = []
    let sum = 0
    for (let j = 0; j < 96; j += 4) {
      let perHourTime = parseInt(columns[TIME_COLUMN_START_INDEX + j]) +
        parseInt(columns[TIME_COLUMN_START_INDEX + j + 1]) +
        parseInt(columns[TIME_COLUMN_START_INDEX + j + 2]) +
        parseInt(columns[TIME_COLUMN_START_INDEX + j + 3])

      if (perHourTime < 0) {
        perHourTime = -1
      }

      lastDetectorPerHour[j / 4] += perHourTime

      sum += perHourTime
      perHour.push(perHourTime)
    }
    lastSum += sum
    const nmRegion = columns[3 + 96] //.replaceAll('"', '')
    const qtVolumn24 = columns[5 + 96]
    qtVolumn24Sum += parseInt(qtVolumn24)
    if (
      lines[i + 1] === undefined ||
      lines[i + 1].split(',')[0] !== LastScatsSiteId
    ) {
      processedLine.push(
        LastScatsSiteId,
        lastDetectorPerHour.join(','),
        nmRegion,
        qtVolumn24Sum.toString(),
        lastSum.toString(),
      )

      processedDataList.push(processedLine.join(','))

      LastScatsSiteId = lines[i + 1].split(',')[0]
      lastSum = 0
      qtVolumn24Sum = 0
      for (let k = 0; k < 24; k++) {
        lastDetectorPerHour[k] = 0
      }
    }
  }
  return processedDataList.join('\n')
}

async function main() {
  const commanLineArguments = parseCommandLineArgument()

  if (commanLineArguments.log) {
    console.log(commanLineArguments)
  }

  const fileContent = await getFileContent(commanLineArguments.inFilePath)
  if (commanLineArguments.combine) {
    const processedData = dataProcessingCombinedDetector(fileContent)
    writeToFile(processedData, commanLineArguments.outFilePath)
  } else {
    const processedData = dataProcessingPerDetector(fileContent)
    writeToFile(processedData, commanLineArguments.outFilePath)
  }
}

main()
