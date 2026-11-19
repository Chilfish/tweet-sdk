import type {
  IListTweetsResponse,
  IRawSpace,
  ISpaceDetailsResponse,
  RawArticleBlock,
  RawArticleContentState,
  RawArticleEntityValue,
  RawArticleMedia,
  RawArticleResult,
  UserData,
  UserDetails,
} from '../src/internals'
import { expectTypeOf, it } from 'vitest'

it('internals type-only surface stays nameable', () => {
  expectTypeOf<UserData>().toMatchTypeOf<{
    id: string
    profileImage: string
    userName: string
  }>()
  expectTypeOf<UserDetails>().toHaveProperty('raw')
  expectTypeOf<UserDetails>().toHaveProperty('toJSON')

  expectTypeOf<IListTweetsResponse>().toHaveProperty('data')
  expectTypeOf<IRawSpace>().toHaveProperty('rest_id')
  expectTypeOf<ISpaceDetailsResponse>().toMatchTypeOf<IRawSpace>()

  expectTypeOf<RawArticleBlock>().toHaveProperty('type')
  expectTypeOf<RawArticleContentState>().toHaveProperty('blocks')
  expectTypeOf<RawArticleEntityValue>().toHaveProperty('data')
  expectTypeOf<RawArticleMedia>().toHaveProperty('media_key')
  expectTypeOf<RawArticleResult>().toHaveProperty('content_state')
})
