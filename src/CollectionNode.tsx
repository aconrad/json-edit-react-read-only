import React, { useEffect, useState, useMemo, useRef } from 'react'
import extractProperty from 'object-property-extractor'
import { ValueNodeWrapper } from './ValueNodeWrapper'
import { EditButtons, InputButtons } from './ButtonPanels'
import { getCustomNode } from './CustomNode'
import { type CollectionNodeProps, type NodeData, type CollectionData } from './types'
import { Icon } from './Icons'
import { filterNode, isCollection } from './filterHelpers'
import './style.css'
import { AutogrowTextArea } from './AutogrowTextArea'
import { useTheme } from './theme'
import { useTreeState } from './TreeStateProvider'
import { useCollapseTransition, useCommon, useDragNDrop } from './hooks'

export const CollectionNode: React.FC<CollectionNodeProps> = (props) => {
  const { getStyles } = useTheme()
  const {
    collapseState,
    setCollapseState,
    doesPathMatch,
    currentlyEditingElement,
    setCurrentlyEditingElement,
    areChildrenBeingEdited,
  } = useTreeState()
  const {
    data,
    nodeData: incomingNodeData,
    parentData,
    showCollectionCount,
    onEdit,
    onAdd,
    onDelete,
    canDragOnto,
    collapseFilter,
    collapseAnimationTime,
    onMove,
    enableClipboard,
    searchFilter,
    searchText,
    indent,
    keySort,
    showArrayIndices,
    defaultValue,
    translate,
    customNodeDefinitions,
    jsonParse,
    jsonStringify,
  } = props
  const [stringifiedValue, setStringifiedValue] = useState(jsonStringify(data))

  const startCollapsed = collapseFilter(incomingNodeData)

  const { contentRef, isAnimating, maxHeight, collapsed, animateCollapse } = useCollapseTransition(
    data,
    collapseAnimationTime,
    startCollapsed
  )

  const {
    pathString,
    nodeData,
    path,
    name,
    size,
    canEdit,
    canDelete,
    canAdd,
    canDrag,
    error,
    setError,
    onError,
    handleEditKey,
    derivedValues,
  } = useCommon({ props, collapsed })

  const { dragSourceProps, getDropTargetProps, BottomDropTarget, DropTargetPadding } = useDragNDrop(
    { canDrag, canDragOnto, path, nodeData, onMove, onError, translate }
  )

  // This allows us to not render the children on load if they're hidden (which
  // gives a big performance improvement with large data sets), but still keep
  // the animation transition when opening and closing the accordion
  const hasBeenOpened = useRef(!startCollapsed)

  useEffect(() => {
    setStringifiedValue(jsonStringify(data))
  }, [data])

  useEffect(() => {
    const shouldBeCollapsed = collapseFilter(nodeData) && !derivedValues.isEditing
    hasBeenOpened.current = !shouldBeCollapsed
    animateCollapse(shouldBeCollapsed)
  }, [collapseFilter])

  useEffect(() => {
    if (collapseState !== null && doesPathMatch(path)) {
      hasBeenOpened.current = true
      animateCollapse(collapseState.collapsed)
    }
  }, [collapseState])

  const getDefaultNewValue = useMemo(
    () => (nodeData: NodeData) => {
      if (typeof defaultValue !== 'function') return defaultValue
      return defaultValue(nodeData)
    },
    [defaultValue]
  )

  const {
    CustomNode,
    customNodeProps,
    CustomWrapper,
    wrapperProps = {},
    hideKey,
    showEditTools = true,
    showOnEdit,
    showOnView,
    showCollectionWrapper = true,
  } = useMemo(() => getCustomNode(customNodeDefinitions, nodeData), [])

  // Early return if this node is filtered out
  if (!filterNode('collection', nodeData, searchFilter, searchText) && nodeData.level > 0)
    return null

  const collectionType = Array.isArray(data) ? 'array' : 'object'
  const brackets =
    collectionType === 'array' ? { open: '[', close: ']' } : { open: '{', close: '}' }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.shiftKey || e.ctrlKey)) handleEdit()
    else if (e.key === 'Escape') handleCancel()
  }

  const handleCollapse = (e: React.MouseEvent) => {
    if (e.getModifierState('Alt')) {
      hasBeenOpened.current = true
      setCollapseState({ collapsed: !collapsed, path })
      return
    }
    if (!(currentlyEditingElement && currentlyEditingElement.includes(pathString))) {
      hasBeenOpened.current = true
      setCollapseState(null)
      animateCollapse(!collapsed)
    }
  }

  const handleEdit = () => {
    try {
      const value = jsonParse(stringifiedValue)
      setCurrentlyEditingElement(null)
      setError(null)
      if (JSON.stringify(value) === JSON.stringify(data)) return
      onEdit(value, path).then((error) => {
        if (error) {
          onError({ code: 'UPDATE_ERROR', message: error }, value as CollectionData)
        }
      })
    } catch {
      onError(
        { code: 'INVALID_JSON', message: translate('ERROR_INVALID_JSON', nodeData) },
        stringifiedValue
      )
    }
  }

  const handleKeyPressKeyEdit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditKey((e.target as HTMLInputElement).value)
    else if (e.key === 'Escape') handleCancel()
  }

  const handleAdd = (key: string) => {
    animateCollapse(false)
    const newValue = getDefaultNewValue(nodeData)
    if (collectionType === 'array') {
      onAdd(newValue, [...path, (data as unknown[]).length]).then((error) => {
        if (error) onError({ code: 'ADD_ERROR', message: error }, newValue as CollectionData)
      })
    } else if (key in data) {
      onError({ code: 'KEY_EXISTS', message: translate('ERROR_KEY_EXISTS', nodeData) }, key)
    } else {
      onAdd(newValue, [...path, key]).then((error) => {
        if (error) onError({ code: 'ADD_ERROR', message: error }, newValue as CollectionData)
      })
    }
  }

  const handleDelete =
    path.length > 0
      ? () => {
          onDelete(data, path).then((error) => {
            if (error) {
              onError(
                { code: 'DELETE_ERROR', message: error },
                extractProperty(data, path) as CollectionData
              )
            }
          })
        }
      : undefined

  const handleCancel = () => {
    setCurrentlyEditingElement(null)
    setError(null)
    setStringifiedValue(jsonStringify(data))
  }

  // DERIVED VALUES (this makes the JSX conditional logic easier to follow)
  const { isEditing, isEditingKey, isArray, canEditKey } = derivedValues
  const showLabel = showArrayIndices || !isArray
  const showCount = showCollectionCount === 'when-closed' ? collapsed : showCollectionCount
  const showEditButtons = !isEditing && showEditTools
  const showKey = showLabel && !hideKey && name !== undefined
  const showCustomNodeContents =
    CustomNode && ((isEditing && showOnEdit) || (!isEditing && showOnView))
  const sortKeys = keySort && collectionType === 'object'

  const keyValueArray = Object.entries(data).map(([key, value]) => [
    collectionType === 'array' ? Number(key) : key,
    value,
  ])

  if (sortKeys) {
    keyValueArray.sort(
      typeof keySort === 'function' ? (a: string[], b) => keySort(a[0], b[0] as string) : undefined
    )
  }

  const CollectionChildren = !hasBeenOpened.current ? null : !isEditing ? (
    keyValueArray.map(([key, value], index) => {
      const childNodeData = {
        key,
        value,
        path: [...path, key],
        level: path.length + 1,
        index,
        size: isCollection(value) ? Object.keys(value as object).length : 1,
        parentData: data,
        fullData: nodeData.fullData,
      }
      return (
        <div
          className="jer-collection-element"
          key={key}
          style={getStyles('collectionElement', childNodeData)}
        >
          {isCollection(value) ? (
            <CollectionNode
              key={key}
              {...props}
              data={value}
              parentData={data}
              nodeData={childNodeData}
              showCollectionCount={showCollectionCount}
              canDragOnto={canEdit}
            />
          ) : (
            <ValueNodeWrapper
              key={key}
              {...props}
              data={value}
              parentData={data}
              nodeData={childNodeData}
              canDragOnto={canEdit}
              showLabel={collectionType === 'object' ? true : showArrayIndices}
            />
          )}
        </div>
      )
    })
  ) : (
    <div className="jer-collection-text-edit">
      <div>
        <AutogrowTextArea
          className="jer-collection-text-area"
          name={pathString}
          value={stringifiedValue}
          setValue={setStringifiedValue}
          isEditing={isEditing}
          handleKeyPress={handleKeyPress}
          styles={getStyles('input', nodeData)}
        />
        <div className="jer-collection-input-button-row">
          <InputButtons onOk={handleEdit} onCancel={handleCancel} nodeData={nodeData} />
        </div>
      </div>
    </div>
  )

  // If the collection wrapper (expand icon, brackets, etc) is hidden, there's
  // no way to open a collapsed custom node, so this ensures it will stay open.
  // It can still be displayed collapsed by handling it internally if this is
  // desired.
  const isCollapsed = !showCollectionWrapper ? false : collapsed
  if (!isCollapsed) hasBeenOpened.current = true

  const customNodeAllProps = {
    ...props,
    data,
    value: data,
    parentData,
    nodeData,
    setValue: async (val: unknown) => await onEdit(val, path),
    handleEdit,
    handleCancel,
    handleKeyPress,
    isEditing,
    setIsEditing: () => setCurrentlyEditingElement(pathString),
    getStyles,
    canDragOnto: canEdit,
  }

  const CollectionContents = showCustomNodeContents ? (
    <CustomNode customNodeProps={customNodeProps} {...customNodeAllProps}>
      {CollectionChildren}
    </CustomNode>
  ) : (
    CollectionChildren
  )

  const KeyDisplay = isEditingKey ? (
    <input
      className="jer-input-text jer-key-edit"
      type="text"
      name={pathString}
      defaultValue={name}
      autoFocus
      onFocus={(e) => e.target.select()}
      onKeyDown={handleKeyPressKeyEdit}
      style={{ width: `${String(name).length / 1.5 + 0.5}em` }}
    />
  ) : (
    showKey && (
      <span
        className="jer-key-text"
        style={getStyles('property', nodeData)}
        onDoubleClick={() => canEditKey && setCurrentlyEditingElement(`key_${pathString}`)}
      >
        {name === '' ? (
          <span className={path.length > 0 ? 'jer-empty-string' : undefined}>
            {/* display "<empty string>" using pseudo class CSS */}
          </span>
        ) : (
          `${name}:`
        )}
      </span>
    )
  )

  const EditButtonDisplay = showEditButtons && (
    <EditButtons
      startEdit={
        canEdit
          ? () => {
              hasBeenOpened.current = true
              setCurrentlyEditingElement(pathString)
            }
          : undefined
      }
      handleAdd={canAdd ? handleAdd : undefined}
      handleDelete={canDelete ? handleDelete : undefined}
      enableClipboard={enableClipboard}
      type={collectionType}
      nodeData={nodeData}
      translate={translate}
    />
  )

  const CollectionNodeComponent = (
    <div
      className="jer-component jer-collection-component"
      style={{
        marginLeft: `${path.length === 0 ? 0 : indent / 2}em`,
        ...getStyles('collection', nodeData),
        position: 'relative',
      }}
      draggable={canDrag}
      {...dragSourceProps}
      {...getDropTargetProps('above')}
    >
      {!isEditing && BottomDropTarget}
      <DropTargetPadding position="above" nodeData={nodeData} />
      {showCollectionWrapper ? (
        <div className="jer-collection-header-row" style={{ position: 'relative' }}>
          <div className="jer-collection-name">
            <div className="jer-collapse-icon" onClick={(e) => handleCollapse(e)}>
              <Icon name="chevron" rotate={collapsed} nodeData={nodeData} />
            </div>
            {KeyDisplay}
            {!isEditing && (
              <span
                className="jer-brackets jer-bracket-open"
                style={getStyles('bracket', nodeData)}
              >
                {brackets.open}
              </span>
            )}
          </div>
          {!isEditing && showCount && (
            <div
              className={`jer-collection-item-count${showCount ? ' jer-visible' : ' jer-hidden'}`}
              style={getStyles('itemCount', nodeData)}
            >
              {size === 1
                ? translate('ITEM_SINGLE', { ...nodeData, size: 1 }, 1)
                : translate('ITEMS_MULTIPLE', nodeData, size as number)}
            </div>
          )}
          <div
            className={`jer-brackets${isCollapsed ? ' jer-visible' : ' jer-hidden'}`}
            style={getStyles('bracket', nodeData)}
          >
            {brackets.close}
          </div>
          {EditButtonDisplay}
        </div>
      ) : hideKey ? (
        <></>
      ) : (
        <div className="jer-collection-header-row" style={{ position: 'relative' }}>
          {KeyDisplay}
          {EditButtonDisplay}
        </div>
      )}
      <div
        className={'jer-collection-inner'}
        style={{
          overflowY: isCollapsed || isAnimating ? 'clip' : 'visible',
          // Prevent collapse if this node or any children are being edited
          maxHeight: areChildrenBeingEdited(pathString) ? undefined : maxHeight,
          ...getStyles('collectionInner', nodeData),
        }}
        ref={contentRef}
      >
        {CollectionContents}
        <div className={isEditing ? 'jer-collection-error-row' : 'jer-collection-error-row-edit'}>
          {error && (
            <span className="jer-error-slug" style={getStyles('error', nodeData)}>
              {error}
            </span>
          )}
        </div>
        {!isEditing && showCollectionWrapper && (
          <div
            className="jer-brackets jer-bracket-outside"
            style={{
              ...getStyles('bracket', nodeData),
              marginLeft: `${indent < 3 ? -1 : indent < 6 ? -0.5 : 0}em`,
            }}
          >
            {brackets.close}
          </div>
        )}
      </div>
      <DropTargetPadding position="below" nodeData={nodeData} />
    </div>
  )

  return CustomWrapper ? (
    <CustomWrapper customNodeProps={wrapperProps} {...customNodeAllProps}>
      {CollectionNodeComponent}
    </CustomWrapper>
  ) : (
    CollectionNodeComponent
  )
}
