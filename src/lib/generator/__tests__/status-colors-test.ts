jest.mock('react-native', () => ({ processColor: jest.fn() }))
jest.mock('heroui-native', () => ({ useThemeColor: jest.fn() }))

import { processColor } from 'react-native'
import { colorToRgb } from '../status-colors'

const mockProcessColor = processColor as jest.Mock

describe('colorToRgb', () => {
  it('extracts pure red', () => {
    mockProcessColor.mockReturnValue(0xffff0000)
    expect(colorToRgb('red')).toEqual([1, 0, 0])
  })

  it('extracts pure green', () => {
    mockProcessColor.mockReturnValue(0xff00ff00)
    expect(colorToRgb('green')).toEqual([0, 1, 0])
  })

  it('extracts pure blue', () => {
    mockProcessColor.mockReturnValue(0xff0000ff)
    expect(colorToRgb('blue')).toEqual([0, 0, 1])
  })

  it('extracts white', () => {
    mockProcessColor.mockReturnValue(0xffffffff)
    expect(colorToRgb('white')).toEqual([1, 1, 1])
  })

  it('extracts black', () => {
    mockProcessColor.mockReturnValue(0xff000000)
    expect(colorToRgb('black')).toEqual([0, 0, 0])
  })

  it('extracts mid-gray', () => {
    mockProcessColor.mockReturnValue(0xff808080)
    expect(colorToRgb('gray')).toEqual([128 / 255, 128 / 255, 128 / 255])
  })

  it('ignores alpha channel', () => {
    mockProcessColor.mockReturnValue(0x80ff8000)
    expect(colorToRgb('semi-transparent')).toEqual([1, 128 / 255, 0])
  })

  it('fallback for null processColor', () => {
    mockProcessColor.mockReturnValue(null)
    expect(colorToRgb('invalid')).toEqual([0.5, 0.5, 0.5])
  })

  it('fallback for undefined processColor', () => {
    mockProcessColor.mockReturnValue(undefined)
    expect(colorToRgb('invalid')).toEqual([0.5, 0.5, 0.5])
  })

  it('fallback for string return', () => {
    mockProcessColor.mockReturnValue('#FF0000')
    expect(colorToRgb('string-return')).toEqual([0.5, 0.5, 0.5])
  })
})
