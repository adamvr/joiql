/* eslint-env mocha */
const rewire = require('rewire')
const descsToFields = rewire('../').__get__('descsToFields')
const {
  string,
  number,
  object,
  array,
  boolean,
  date,
  alternatives
} = require('joi')

describe('descsToFields', () => {
  it('converts a joi string to GraphQL string', () => {
    const fields = descsToFields({ foo: string() })
    fields.foo.type.name.should.equal('String')
  })

  it('converts various scalar types', () => {
    const fields = descsToFields({
      str: string(),
      int: number().integer(),
      float: number(),
      bool: boolean(),
      date: date()
    })
    fields.str.type.name.should.equal('String')
    fields.int.type.name.should.equal('Int')
    fields.float.type.name.should.equal('Float')
    fields.bool.type.name.should.equal('Boolean')
    fields.date.type.name.should.equal('String')
  })

  it('converts arrays to lists', () => {
    const fields = descsToFields({
      arr: array().items(object({
        a: string(),
        b: number()
      }))
    })
    fields.arr.type.constructor.name.should.equal('GraphQLList')
  })

  it('converts alternatives to a union', () => {
    const video = object({
      type: string().valid('video'),
      url: string(),
      background_color: string()
    })
    const image = object({
      type: string().valid('image'),
      url: string(),
      position: string()
    })
    const fields = descsToFields({
      hero: alternatives().try(video, image)
    })
    fields.hero.type.constructor.name.should.equal('GraphQLUnionType')
  })

  it('names object types by the meta name', () => {
    const fields = descsToFields({
      person: object({
        name: string(),
        age: number()
      }).meta({ name: 'Person' })
    })
    fields.person.type.name.should.equal('Person')
  })

  it('converts meta args to GraphQl arguments', () => {
    const fields = descsToFields({
      person: object({
        name: string(),
        age: number()
      }).meta({ args: { id: number().integer() } })
    })
    fields.person.args.id.type.name.should.equal('Int')
  })

  it('converts required args to GraphQl NonNulls', () => {
    const fields = descsToFields({
      person: object({
        name: string(),
        age: number()
      }).meta({ args: { id: number().integer().required() } })
    })
    fields.person.args.id.type.constructor.name.should.equal('GraphQLNonNull')
  })

  it('converts args to input', () => {
    const fields = descsToFields({
      person: object({
        name: string(),
        age: number()
      }).meta({
        args: {
          address: object({
            city: string().required(),
            country: string()
          })
        }
      })
    })
    fields.person.args.address.type.constructor.name
      .should.equal('GraphQLInputObjectType')
  })

  it('considers descriptions', () => {
    const fields = descsToFields({
      foo: string().description('Just a foo')
    })
    fields.foo.description.should.equal('Just a foo')
  })

  it('creates a union type for a multi array input', () => {
    const fields = descsToFields({
      article: object({
        blocks: array().items(
          object({
            type: string().valid('image'),
            size: number().integer()
          }),
          object({
            type: string().valid('text'),
            body: string()
          })
        )
      })
    })
    const blocks = fields.article.type._typeConfig.fields().blocks
    blocks.type.constructor.name.should.equal('GraphQLList')
    blocks.type.ofType.constructor.name.should.equal('GraphQLUnionType')
    const [img, text] = blocks.type.ofType._typeConfig.types
    img._typeConfig.fields().size.type.name.should.equal('Int')
    text._typeConfig.fields().body.type.name.should.equal('String')
  })
})
