import {SaveEntity, vec3} from '@etothepii/satisfactory-file-parser'

export class Buildable {
  readonly entity: SaveEntity
  cloneIndex: number = 0

  constructor(entity: SaveEntity) {
    this.entity = entity
  }

  clone(): this {
    const cls = Object.getPrototypeOf(this).constructor
    return new cls(this.cloneEntity())
  }

  cloneEntity(): SaveEntity {
    const entity = JSON.parse(JSON.stringify(this.entity))
    entity.instanceName += (this.cloneIndex++)
    return entity
  }

  getPosition(): vec3 {
    return this.entity.transform.translation
  }

  withPosition(x: number, y: number, z: number): this {
    const entity = this.cloneEntity()
    entity.transform.translation.x = x
    entity.transform.translation.y = y
    entity.transform.translation.z = z
    const cls = this.constructor as new (entity: SaveEntity) => this
    return new cls(entity)
  }

  withShiftZ(dz: number): this {
    const pos = this.getPosition()

    return this.withPosition(pos.x, pos.y, pos.z + dz)
  }

  withShiftX(dx: number): this {
    const pos = this.getPosition()

    return this.withPosition(pos.x + dx, pos.y, pos.z)
  }

  withShiftY(dy: number): this {
    const pos = this.getPosition()

    return this.withPosition(pos.x, pos.y + dy, pos.z)
  }
}


export class Sign extends Buildable {

  withText(text: string): Sign {
    const entity = this.cloneEntity()
    // @ts-ignore
    entity.properties.mPrefabTextElementSaveData.values[0].properties.Text.value = text
    return new Sign(entity)
  }

  withAlt(text: string): Sign {
    const entity = this.cloneEntity()
    // @ts-ignore
    entity.properties.mPrefabTextElementSaveData.values[0].properties.Text.value = text
    return new Sign(entity)
  }

  withMinimization(): Sign {
    const entity = this.cloneEntity()

    // @ts-ignore
    delete entity.properties.mGlobalPrefabIconElementSaveData
    // @ts-ignore
    delete entity.properties.mLastEditedBy
    // @ts-ignore
    delete entity.properties.mCustomizationData

    return new Sign(entity)
  }
}
