import React, { useEffect, useState } from 'react'
import {
  InvalidValue,
  INVALID_FUNCTION_STRING,
  StringValueImmutable,
  BooleanValueImmutable,
  NumberValueImmutable,
  NullValueImmutable,
} from './ValueNodes'
import {
  type DataType,
  type ValueNodeImmutableProps,
  type CollectionData,
  type InputImmutableProps,
} from './types'
import { useTheme } from './theme'
import './style.css'
import { type CustomNodeData } from './CustomNode'
import { filterNode } from './filterHelpers'
import { useCommonImmutable } from './hooks'

export const ValueNodeWrapperImmutable: React.FC<ValueNodeImmutableProps> = (props) => {
  const {
    data,
    parentData,
    searchFilter,
    searchText,
    showLabel,
    stringTruncate,
    showStringQuotes,
    indent,
  } = props
  const { getStyles } = useTheme()
  const [value, setValue] = useState<typeof data | CollectionData>(
    // Bad things happen when you put a function into useState
    typeof data === 'function' ? INVALID_FUNCTION_STRING : data
  )

  const {
    nodeData,
    path,
    name,
    error,
  } = useCommonImmutable({ props })

  useEffect(() => {
    setValue(typeof data === 'function' ? INVALID_FUNCTION_STRING : data)
  }, [data])

  // Early return if this node is filtered out
  if (!filterNode('value', nodeData, searchFilter, searchText)) return null



  const handleCancel = () => {
    setValue(data)
  }

  // DERIVED VALUES (this makes the JSX logic less messy)
  const showErrorString = error
  const showKey = showLabel

  const inputProps = {
    value,
    parentData,
    handleCancel,
    path,
    stringTruncate,
    showStringQuotes,
    nodeData,
  }

  const ValueComponent = (
    // Need to re-fetch data type to make sure it's one of the "core" ones
    // when fetching a non-custom component
    getInputComponent(getDataType(data) as DataType, inputProps)
  )

  return (
    <div
      className="jer-component jer-value-component"
      style={{
        marginLeft: `${indent / 2}em`,
        position: 'relative',
      }}
    >
      <div
        className="jer-value-main-row"
        style={{
          flexWrap: (name as string).length > 10 ? 'wrap' : 'nowrap',
        }}
      >
        {showKey && (
          <span
            className="jer-key-text"
            style={{
              ...getStyles('property', nodeData),
              minWidth: `${Math.min(String(name).length + 1, 5)}ch`,
              flexShrink: (name as string).length > 10 ? 1 : 0,
            }}
          >
            {name === '' ? (
              <span className="jer-empty-string">
                {/* display "<empty string>" using pseudo class CSS */}
              </span>
            ) : (
              name
            )}
            :
          </span>
        )}
        <div className="jer-value-and-buttons">
          <div className="jer-input-component">{ValueComponent}</div>
          {showErrorString && (
            <span className="jer-error-slug" style={getStyles('error', nodeData)}>
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const getDataType = (value: unknown, customNodeData?: CustomNodeData) => {
  if (customNodeData?.CustomNode && customNodeData?.name && customNodeData.showInTypesSelector) {
    return customNodeData.name
  }
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value === null) return 'null'
  return 'invalid'
}

const getInputComponent = (dataType: DataType, inputProps: InputImmutableProps) => {
  const value = inputProps.value
  switch (dataType) {
    case 'string':
      return <StringValueImmutable {...inputProps} value={value as string} />
    case 'number':
      return <NumberValueImmutable {...inputProps} value={value as number} />
    case 'boolean':
      return <BooleanValueImmutable {...inputProps} value={value as boolean} />
    case 'null':
      return <NullValueImmutable {...inputProps} />
    default:
      return <InvalidValue {...inputProps} />
  }
}


