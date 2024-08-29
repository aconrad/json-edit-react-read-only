import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CollectionNodeImmutable } from './CollectionNodeImmutable'
import { isCollection, matchNode, matchNodeKey } from './filterHelpers'
import {
  type FilterFunction,
  type NodeData,
  type SearchFilterFunction,
  type JsonData,
  type JsonViewerProps,
} from './types'
import { useTheme, ThemeProvider } from './theme'
import { TreeStateProvider } from './TreeStateProvider'
import { useData } from './hooks/useData'
import { getTranslateFunction } from './localisation'
import './style.css'
import { ValueNodeWrapperImmutable } from './ValueNodeWrapperImmutable'

const Viewer: React.FC<JsonViewerProps> = ({
  data: srcData,
  setData: srcSetData,
  rootName = 'root',
  onError,
  showErrorMessages = true,
  enableClipboard = true,
  indent = 2,
  collapse = false,
  collapseAnimationTime = 300, // must be equivalent to CSS value
  showCollectionCount = true,
  restrictTypeSelection = false,
  searchFilter: searchFilterInput,
  searchText,
  searchDebounceTime = 350,
  keySort = false,
  showArrayIndices = true,
  showStringQuotes = true,
  defaultValue = null,
  minWidth = 250,
  maxWidth = 'min(600px, 90vw)',
  rootFontSize,
  stringTruncate = 250,
  translations = {},
  className,
  id,
  customText = {},
  customNodeDefinitions = [],
  jsonParse = JSON.parse,
  jsonStringify = (data: JsonData) => JSON.stringify(data, null, 2),
}) => {
  const { getStyles } = useTheme()
  const collapseFilter = useCallback(getFilterFunction(collapse), [collapse])
  const translate = useCallback(getTranslateFunction(translations, customText), [
    translations,
    customText,
  ])
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText)

  const [data] = useData<JsonData>({ setData: srcSetData, data: srcData })

  const docRoot = document.querySelector(':root') as HTMLElement
  const transitionTime = getComputedStyle(document.documentElement).getPropertyValue(
    '--jer-expand-transition-time'
  )
  if (parseFloat(transitionTime) * 1000 !== collapseAnimationTime) {
    docRoot?.style.setProperty('--jer-expand-transition-time', `${collapseAnimationTime / 1000}s`)
  }

  useEffect(() => {
    const debounce = setTimeout(() => setDebouncedSearchText(searchText), searchDebounceTime)
    return () => clearTimeout(debounce)
  }, [searchText, searchDebounceTime])

  const nodeData: NodeData = {
    key: rootName,
    path: [],
    level: 0,
    index: 0,
    value: data,
    size: typeof data === 'object' && data !== null ? Object.keys(data).length : 1,
    parentData: null,
    fullData: data,
  }

  const searchFilter = useMemo(() => getSearchFilter(searchFilterInput), [searchFilterInput])

  const otherProps = {
    name: rootName,
    nodeData,
    onError,
    showErrorMessages,
    showCollectionCount,
    collapseFilter,
    collapseAnimationTime,
    restrictTypeSelection,
    searchFilter,
    searchText: debouncedSearchText,
    enableClipboard,
    keySort,
    showArrayIndices,
    showStringQuotes,
    indent,
    defaultValue,
    stringTruncate,
    translate,
    customNodeDefinitions,
    parentData: null,
    jsonParse,
    jsonStringify,
  }

  const mainContainerStyles = { ...getStyles('container', nodeData), minWidth, maxWidth }

  // Props fontSize takes priority over theme, but we fall back on a default of
  // 16 (from CSS sheet) if neither are provided. Having a defined base size
  // ensures the component doesn't have its fontSize affected from the parent
  // environment
  mainContainerStyles.fontSize = rootFontSize ?? mainContainerStyles.fontSize

  return (
    <div id={id} className={'jer-editor-container ' + className} style={mainContainerStyles}>
      {isCollection(data) ? (
        <CollectionNodeImmutable data={data} {...otherProps} />
      ) : (
        <ValueNodeWrapperImmutable data={data as any} showLabel {...otherProps} />
      )}
    </div>
  )
}

const JsonViewer: React.FC<JsonViewerProps> = (props) => {
  return (
    <ThemeProvider theme={props.theme} icons={props.icons}>
      <TreeStateProvider>
        <Viewer {...props} />
      </TreeStateProvider>
    </ThemeProvider>
  )
}


const getFilterFunction = (propValue: boolean | number | FilterFunction): FilterFunction => {
  if (typeof propValue === 'boolean') return () => propValue
  if (typeof propValue === 'number') return ({ level }) => level >= propValue
  return propValue
}

const getSearchFilter = (
  searchFilterInput: 'key' | 'value' | 'all' | SearchFilterFunction | undefined
): SearchFilterFunction | undefined => {
  if (searchFilterInput === undefined) return undefined
  if (searchFilterInput === 'value') {
    return matchNode as SearchFilterFunction
  }
  if (searchFilterInput === 'key') {
    return matchNodeKey
  }
  if (searchFilterInput === 'all') {
    return (inputData, searchText) =>
      matchNode(inputData, searchText) || matchNodeKey(inputData, searchText)
  }
  return searchFilterInput
}

export default JsonViewer
