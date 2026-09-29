import codecs
text = codecs.open('prisma/schema.prisma', 'r', 'utf8').read()

text = text.replace('payments  Payment[]\n\n  @@map("organization")', 'payments  Payment[]\n  zones     Zone[]\n\n  @@map("organization")')

text = text.replace('model AgentProfile {', '''model Zone {
  id          String   @id @default(uuid())
  workspaceId String
  name        String
  minLat      Float
  maxLat      Float
  minLng      Float
  maxLng      Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace   Organization @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  customers   Customer[]
  routes      Route[]

  @@map("zones")
}

model AgentProfile {''')

text = text.replace('workspace Organization @relation(fields: [workspaceId], references: [id], onDelete: Cascade)\n  stops     RouteStop[]', 'workspace Organization @relation(fields: [workspaceId], references: [id], onDelete: Cascade)\n  zoneId    String?\n  zone      Zone?    @relation(fields: [zoneId], references: [id], onDelete: SetNull)\n  stops     RouteStop[]')

text = text.replace('workspace Organization @relation(fields: [workspaceId], references: [id], onDelete: Cascade)\n  agent     User?', 'workspace Organization @relation(fields: [workspaceId], references: [id], onDelete: Cascade)\n  zoneId    String?\n  zone      Zone?    @relation(fields: [zoneId], references: [id], onDelete: SetNull)\n  agent     User?')

codecs.open('prisma/schema.prisma', 'w', 'utf8').write(text)
