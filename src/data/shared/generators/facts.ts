// Fact shapes the generator-lifecycle policy needs. Schema-agnostic;
// adapters build them from their own Drizzle dialect.

export interface GeneratorRef {
  organizationId: string
}

// Port: anything that can answer "does this generator exist, and what org
// does it belong to" is a valid fact source. `findGenerator` returns `null`
// when the generator does not exist.
export interface GeneratorFactsProvider {
  findGenerator(generatorId: string): Promise<GeneratorRef | null>
}
