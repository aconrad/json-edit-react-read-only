/**
 * Values and Methods returned from this hook are common to both Collection
 * Nodes and Value Nodes
 */

import { useMemo, useState } from 'react'
import {
  type ErrorString,
  type JerError,
  type JsonData,
  ERROR_DISPLAY_TIME,
  type CollectionNodeImmutableProps,
  type ValueNodeImmutableProps,
} from '../types'
import { toPathString } from '../ValueNodes'

export interface CommonImmutableProps {
  props: CollectionNodeImmutableProps | ValueNodeImmutableProps
  collapsed?: boolean
}

export const useCommonImmutable = ({ props, collapsed }: CommonImmutableProps) => {
  const {
    data,
    nodeData: incomingNodeData,
    onError: onErrorCallback,
    showErrorMessages,
  } = props
  const [error, setError] = useState<string | null>(null)

  const nodeData = { ...incomingNodeData, collapsed }
  const { path, key: name, size } = nodeData

  const pathString = toPathString(path)

  const showError = (errorString: ErrorString) => {
    if (showErrorMessages) {
      setError(errorString)
      setTimeout(() => setError(null), ERROR_DISPLAY_TIME)
    }
    console.warn('Error', errorString)
  }

  const onError = useMemo(
    () => (error: JerError, errorValue: JsonData | string) => {
      showError(error.message)
      if (onErrorCallback) {
        onErrorCallback({
          currentData: nodeData.fullData,
          errorValue,
          currentValue: data,
          name,
          path,
          error,
        })
      }
    },
    [onErrorCallback, showErrorMessages]
  )

  // Common DERIVED VALUES (this makes the JSX logic less messy)
  const isArray = typeof path.slice(-1)[0] === 'number'

  const derivedValues = { isArray }

  return {
    pathString,
    nodeData,
    path,
    name,
    size,
    error,
    showError,
    onError,
    setError,
    derivedValues,
  }
}
