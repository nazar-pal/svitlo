import {
  transferAssignmentsAndRemoveMember,
  type MemberRef,
  type MemberWritePort
} from '..'

const ORG = 'org-1'
const USER = 'user-1'
const ADMIN = 'admin-1'
const MEMBERSHIP = 'membership-1'
const NOW = new Date('2025-01-01T00:00:00Z')

const MEMBER: MemberRef = {
  id: MEMBERSHIP,
  organizationId: ORG,
  userId: USER
}

function makePort(
  assignments: { generatorId: string }[] = []
): MemberWritePort & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async listAssignmentsForMemberInOrg() {
      calls.push('list')
      return assignments
    },
    async reassignGeneratorAssignment({ generatorId }) {
      calls.push(`reassign:${generatorId}`)
    },
    async deleteMembership(id) {
      calls.push(`delete:${id}`)
    }
  }
}

describe('transferAssignmentsAndRemoveMember', () => {
  it('reassigns each assignment to admin then deletes membership', async () => {
    const port = makePort([{ generatorId: 'gen-1' }, { generatorId: 'gen-2' }])

    await transferAssignmentsAndRemoveMember(port, {
      member: MEMBER,
      adminUserId: ADMIN,
      now: NOW
    })

    expect(port.calls).toEqual([
      'list',
      'reassign:gen-1',
      'reassign:gen-2',
      `delete:${MEMBERSHIP}`
    ])
  })

  it('passes correct params to reassignGeneratorAssignment', async () => {
    const captured: Parameters<
      MemberWritePort['reassignGeneratorAssignment']
    >[0][] = []
    const port: MemberWritePort = {
      async listAssignmentsForMemberInOrg() {
        return [{ generatorId: 'gen-1' }]
      },
      async reassignGeneratorAssignment(params) {
        captured.push(params)
      },
      async deleteMembership() {}
    }

    await transferAssignmentsAndRemoveMember(port, {
      member: MEMBER,
      adminUserId: ADMIN,
      now: NOW
    })

    expect(captured).toEqual([
      {
        generatorId: 'gen-1',
        fromUserId: USER,
        toUserId: ADMIN,
        assignedAt: NOW
      }
    ])
  })

  it('deletes membership even when there are no assignments', async () => {
    const port = makePort([])

    await transferAssignmentsAndRemoveMember(port, {
      member: MEMBER,
      adminUserId: ADMIN,
      now: NOW
    })

    expect(port.calls).toEqual(['list', `delete:${MEMBERSHIP}`])
  })
})
