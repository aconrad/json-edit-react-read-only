import React, { useEffect, useState, useRef } from 'react'
import { type CollectionNodeImmutableProps } from './types'
import { Icon } from './Icons'
import { filterNode, isCollection } from './filterHelpers'
import './style.css'
import { useTheme } from './theme'
import { useTreeState } from './TreeStateProvider'
import { useCollapseTransition, useCommonImmutable } from './hooks'
import { ValueNodeWrapperImmutable } from './ValueNodeWrapperImmutable'

export const CollectionNodeImmutable: React.FC<CollectionNodeImmutableProps> = (props) => {
  const { getStyles } = useTheme()
  const {
    collapseState,
    setCollapseState,
    doesPathMatch,
    currentlyEditingElement,
    areChildrenBeingEdited,
  } = useTreeState()
  const {
    data,
    nodeData: incomingNodeData,
    showCollectionCount,
    collapseFilter,
    collapseAnimationTime,
    searchFilter,
    searchText,
    indent,
    keySort,
    showArrayIndices,
    jsonStringify,
  } = props
  const [_, setStringifiedValue] = useState(jsonStringify(data))

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
    error,
    derivedValues,
  } = useCommonImmutable({ props, collapsed })

  // This allows us to not render the children on load if they're hidden (which
  // gives a big performance improvement with large data sets), but still keep
  // the animation transition when opening and closing the accordion
  const hasBeenOpened = useRef(!startCollapsed)

  useEffect(() => {
    setStringifiedValue(jsonStringify(data))
  }, [data])

  useEffect(() => {
    const shouldBeCollapsed = collapseFilter(nodeData)
    hasBeenOpened.current = !shouldBeCollapsed
    animateCollapse(shouldBeCollapsed)
  }, [collapseFilter])

  useEffect(() => {
    if (collapseState !== null && doesPathMatch(path)) {
      hasBeenOpened.current = true
      animateCollapse(collapseState.collapsed)
    }
  }, [collapseState])


  // Early return if this node is filtered out
  if (!filterNode('collection', nodeData, searchFilter, searchText) && nodeData.level > 0)
    return null

  const collectionType = Array.isArray(data) ? 'array' : 'object'
  const brackets =
    collectionType === 'array' ? { open: '[', close: ']' } : { open: '{', close: '}' }


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



  // DERIVED VALUES (this makes the JSX conditional logic easier to follow)
  const { isArray } = derivedValues
  const showLabel = showArrayIndices || !isArray
  const showCount = showCollectionCount === 'when-closed' ? collapsed : showCollectionCount
  const showKey = showLabel && name !== undefined
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

  const CollectionChildren = !hasBeenOpened.current ? null :  (
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
            <CollectionNodeImmutable
              key={key}
              {...props}
              data={value}
              parentData={data}
              nodeData={childNodeData}
              showCollectionCount={showCollectionCount}
            />
          ) : (
            <ValueNodeWrapperImmutable
              key={key}
              {...props}
              data={value}
              parentData={data}
              nodeData={childNodeData}
              showLabel={collectionType === 'object' ? true : showArrayIndices}
            />
          )}
        </div>
      )
    })
  )

  // If the collection wrapper (expand icon, brackets, etc) is hidden, there's
  // no way to open a collapsed custom node, so this ensures it will stay open.
  // It can still be displayed collapsed by handling it internally if this is
  // desired.
  const isCollapsed = collapsed
  if (!isCollapsed) hasBeenOpened.current = true

  const CollectionContents = (
    CollectionChildren
  )

  const KeyDisplay = (
    showKey && (
      <span
        className="jer-key-text"
        style={getStyles('property', nodeData)}
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

  const CollectionNodeComponent = (
    <div
      className="jer-component jer-collection-component"
      style={{
        marginLeft: `${path.length === 0 ? 0 : indent / 2}em`,
        ...getStyles('collection', nodeData),
        position: 'relative',
      }}
    >
      {showCollectionWrapper ? (
        <div className="jer-collection-header-row" style={{ position: 'relative' }}>
          <div className="jer-collection-name">
            <div className="jer-collapse-icon" onClick={(e) => handleCollapse(e)}>
              <Icon name="chevron" rotate={collapsed} nodeData={nodeData} />
            </div>
            {KeyDisplay}
              <span
                className="jer-brackets jer-bracket-open"
                style={getStyles('bracket', nodeData)}
              >
                {brackets.open}
              </span>
          </div>
          {showCount && (
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
        </div>
      ) : (
        <div className="jer-collection-header-row" style={{ position: 'relative' }}>
          {KeyDisplay}
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
        <div className={'jer-collection-error-row-edit'}>
          {error && (
            <span className="jer-error-slug" style={getStyles('error', nodeData)}>
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return CollectionNodeComponent
}
